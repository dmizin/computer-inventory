"""
1Password Connect integration service - COMPLETE FIXED VERSION
"""
import httpx
import json
import logging
from typing import Optional, Dict, Any, List, Union
from uuid import UUID
from datetime import datetime
import ssl

from ..config import Settings
from ..models import Asset, ManagementController

logger = logging.getLogger(__name__)


class OnePasswordError(Exception):
    """1Password operation error"""
    pass


class OnePasswordService:
    """1Password Connect API service"""

    def __init__(self, settings: Settings):
        self.settings = settings
        self.enabled = settings.onepassword_enabled
        self.connect_host = settings.op_connect_host
        self.api_token = settings.op_api_token
        self.vault_name = settings.op_vault_name
        self.timeout = settings.op_connection_timeout

        # Default credentials by management controller type
        self.mgmt_defaults = {
            'idrac': {'username': 'root', 'password': 'changeme'},
            'ilo': {'username': 'Administrator', 'password': 'changeme'},
            'ipmi': {'username': 'admin', 'password': 'changeme'},
            'redfish': {'username': 'admin', 'password': 'changeme'}
        }

    def _get_headers(self) -> Dict[str, str]:
        """Get HTTP headers for 1Password Connect API"""
        return {
            'Authorization': f'Bearer {self.api_token}',
            'Content-Type': 'application/json'
        }

    def _get_ssl_config(self) -> Union[bool, str, ssl.SSLContext]:
        """Get SSL configuration for httpx client"""
        if not self.settings.op_ssl_verify:
            logger.warning("SSL verification disabled for 1Password Connect - use only for testing!")
            return False
        elif self.settings.op_ssl_cert_file:
            logger.info(f"Using custom CA certificate: {self.settings.op_ssl_cert_file}")
            return self.settings.op_ssl_cert_file
        else:
            return True

    def _create_http_client(self) -> httpx.AsyncClient:
        """Create httpx client with proper SSL configuration"""
        verify = self._get_ssl_config()
        return httpx.AsyncClient(
            timeout=self.timeout,
            verify=verify
        )

    async def test_connectivity(self) -> bool:
        """Test 1Password Connect connectivity and token validity"""
        if not self.enabled:
            return True

        if not self.connect_host or not self.api_token:
            raise OnePasswordError("1Password Connect host or API token not configured")

        try:
            async with self._create_http_client() as client:
                response = await client.get(
                    f"{self.connect_host}/health",
                    headers=self._get_headers()
                )

                if response.status_code == 200:
                    logger.info("1Password Connect connectivity test successful")
                    return True
                else:
                    raise OnePasswordError(f"1Password Connect returned status {response.status_code}")

        except httpx.TimeoutException:
            raise OnePasswordError("1Password Connect connection timeout")
        except httpx.RequestError as e:
            raise OnePasswordError(f"1Password Connect connection failed: {e}")
        except Exception as e:
            raise OnePasswordError(f"1Password Connect test failed: {e}")

    async def get_vault_id(self) -> str:
        """Get vault ID by name"""
        async with self._create_http_client() as client:
            response = await client.get(
                f"{self.connect_host}/v1/vaults",
                headers=self._get_headers()
            )

            if response.status_code != 200:
                raise OnePasswordError(f"Failed to get vaults: {response.status_code}")

            vaults = response.json()
            for vault in vaults:
                if vault.get('name') == self.vault_name:
                    return vault['id']

            raise OnePasswordError(f"Vault '{self.vault_name}' not found")

    def _build_management_url(self, mgmt_controller: ManagementController, mgmt_credentials: Optional[Dict[str, str]] = None) -> str:
        """Build management URL from controller and optional credentials"""
        if not mgmt_controller:
            return ""

        # If ui_url is explicitly set, use it
        if mgmt_controller.ui_url:
            return mgmt_controller.ui_url

        # Otherwise, construct URL from address and port
        protocol = "https" if mgmt_controller.port == 443 else "http"
        if mgmt_controller.port in [80, 443]:
            return f"{protocol}://{mgmt_controller.address}"
        else:
            return f"{protocol}://{mgmt_controller.address}:{mgmt_controller.port}"

    def _build_secret_data(self, asset: Asset, mgmt_controller: Optional[ManagementController] = None,
                          mgmt_credentials: Optional[Dict[str, str]] = None,
                          os_credentials: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Build 1Password secret data structure - ROBUST CREDENTIAL FIX"""
        secret_name = self.settings.op_secret_template.format(asset_id=asset.id)

        # Build secret fields using updated API structure
        fields = [
            {"id": "asset_name", "label": "Asset Name", "type": "STRING", "value": asset.hostname},
            {"id": "asset_id", "label": "Asset ID", "type": "STRING", "value": str(asset.id)},
            {"id": "asset_fqdn", "label": "Asset FQDN", "type": "STRING", "value": asset.fqdn or ""},
            {"id": "asset_location", "label": "Asset Location", "type": "STRING", "value": asset.location or ""}
        ]

        # Build URLs list for management controller
        urls = []

        # Add management controller credentials and info
        if mgmt_controller:
            # Get management defaults based on controller type
            mgmt_defaults = self.mgmt_defaults.get(mgmt_controller.type, {'username': 'admin', 'password': 'changeme'})

            # ROBUST CREDENTIAL CHECKING - Multiple validation layers
            mgmt_user = mgmt_defaults['username']  # Start with default
            mgmt_pass = mgmt_defaults['password']  # Start with default

            # Check if mgmt_credentials is provided and valid
            if mgmt_credentials is not None:
                logger.debug(f"mgmt_credentials received: {type(mgmt_credentials)} = {mgmt_credentials}")

                if isinstance(mgmt_credentials, dict):
                    # Check if username is provided and not empty
                    if 'username' in mgmt_credentials:
                        provided_username = mgmt_credentials['username']
                        if provided_username and str(provided_username).strip():
                            mgmt_user = str(provided_username).strip()
                            logger.info(f"✅ Using PROVIDED management username: '{mgmt_user}'")
                        else:
                            logger.info(f"⚠️  Empty management username provided, using default: '{mgmt_user}'")

                    # Check if password is provided and not empty
                    if 'password' in mgmt_credentials:
                        provided_password = mgmt_credentials['password']
                        if provided_password and str(provided_password).strip():
                            mgmt_pass = str(provided_password).strip()
                            logger.info(f"✅ Using PROVIDED management password: '{mgmt_pass[:3]}***'")
                        else:
                            logger.info(f"⚠️  Empty management password provided, using default")
                else:
                    logger.warning(f"⚠️  mgmt_credentials is not a dict: {type(mgmt_credentials)}")
            else:
                logger.info(f"ℹ️  No mgmt_credentials provided, using defaults: username='{mgmt_user}'")

            # Build management URL
            mgmt_url = self._build_management_url(mgmt_controller, mgmt_credentials)
            if mgmt_url:
                urls.append({
                    "label": "Management Interface",
                    "primary": True,
                    "href": mgmt_url
                })

            fields.extend([
                {"id": "mgmt_type", "label": "Management Type", "type": "STRING", "value": mgmt_controller.type},
                {"id": "mgmt_address", "label": "Management Address", "type": "STRING", "value": mgmt_controller.address},
                {"id": "mgmt_port", "label": "Management Port", "type": "STRING", "value": str(mgmt_controller.port)},
                {"id": "mgmt_ui_url", "label": "Management UI URL", "type": "STRING", "value": mgmt_url},
                {"id": "mgmt_username", "label": "Management Username", "type": "STRING", "value": mgmt_user},
                {"id": "mgmt_password", "label": "Management Password", "type": "CONCEALED", "value": mgmt_pass}
            ])
        else:
            # Add empty management fields as placeholders
            fields.extend([
                {"id": "mgmt_type", "label": "Management Type", "type": "STRING", "value": ""},
                {"id": "mgmt_address", "label": "Management Address", "type": "STRING", "value": ""},
                {"id": "mgmt_port", "label": "Management Port", "type": "STRING", "value": ""},
                {"id": "mgmt_ui_url", "label": "Management UI URL", "type": "STRING", "value": ""},
                {"id": "mgmt_username", "label": "Management Username", "type": "STRING", "value": "admin"},
                {"id": "mgmt_password", "label": "Management Password", "type": "CONCEALED", "value": "changeme"}
            ])

        # Add OS credentials - SAME ROBUST PATTERN
        os_user = 'root'    # Start with default
        os_pass = 'changeme'  # Start with default
        os_ssh_key = ''     # Start with empty

        # Check if os_credentials is provided and valid
        if os_credentials is not None:
            logger.debug(f"os_credentials received: {type(os_credentials)} = {os_credentials}")

            if isinstance(os_credentials, dict):
                # Check username
                if 'username' in os_credentials:
                    provided_username = os_credentials['username']
                    if provided_username and str(provided_username).strip():
                        os_user = str(provided_username).strip()
                        logger.info(f"✅ Using PROVIDED OS username: '{os_user}'")
                    else:
                        logger.info(f"⚠️  Empty OS username provided, using default: '{os_user}'")

                # Check password
                if 'password' in os_credentials:
                    provided_password = os_credentials['password']
                    if provided_password and str(provided_password).strip():
                        os_pass = str(provided_password).strip()
                        logger.info(f"✅ Using PROVIDED OS password: '{os_pass[:3]}***'")
                    else:
                        logger.info(f"⚠️  Empty OS password provided, using default")

                # Check SSH key
                if 'ssh_key' in os_credentials:
                    provided_ssh_key = os_credentials['ssh_key']
                    if provided_ssh_key and str(provided_ssh_key).strip():
                        os_ssh_key = str(provided_ssh_key).strip()
                        logger.info(f"✅ Using PROVIDED SSH key: {len(os_ssh_key)} characters")
            else:
                logger.warning(f"⚠️  os_credentials is not a dict: {type(os_credentials)}")
        else:
            logger.info(f"ℹ️  No os_credentials provided, using defaults: username='{os_user}'")

        fields.extend([
            {"id": "os_username", "label": "OS Username", "type": "STRING", "value": os_user},
            {"id": "os_password", "label": "OS Password", "type": "CONCEALED", "value": os_pass},
            {"id": "os_ssh_key", "label": "OS SSH Key", "type": "STRING", "value": os_ssh_key}
        ])

        # Build the complete secret data structure
        secret_data = {
            "title": secret_name,
            "category": "LOGIN",
            "vault": {"id": ""},  # Will be filled in by create_or_update_asset_secret
            "fields": fields,
            "tags": ["computer-inventory", "asset", asset.type]
        }

        # Add URLs if we have any
        if urls:
            secret_data["urls"] = urls

        # FINAL DEBUG LOG
        logger.info(f"🔍 Final credential summary for {asset.hostname}:")
        logger.info(f"  Management: user='{mgmt_user}', has_controller={mgmt_controller is not None}")
        logger.info(f"  OS: user='{os_user}'")
        logger.info(f"  URLs: {len(urls)} website(s)")

        return secret_data

    async def _find_secret_by_title(self, vault_id: str, secret_name: str) -> Optional[Dict[str, Any]]:
        """Find secret by title in vault"""
        async with self._create_http_client() as client:
            response = await client.get(
                f"{self.connect_host}/v1/vaults/{vault_id}/items",
                headers=self._get_headers(),
                params={"filter": f'title eq "{secret_name}"'}
            )

            if response.status_code != 200:
                raise OnePasswordError(f"Failed to search secrets: {response.status_code}")

            items = response.json()
            return items[0] if items else None

    async def create_or_update_asset_secret(self, asset: Asset,
                                          mgmt_controller: Optional[ManagementController] = None,
                                          mgmt_credentials: Optional[Dict[str, str]] = None,
                                          os_credentials: Optional[Dict[str, str]] = None) -> str:
        """Create or update 1Password secret for an asset"""
        if not self.enabled:
            return ""

        try:
            vault_id = await self.get_vault_id()
            secret_data = self._build_secret_data(asset, mgmt_controller, mgmt_credentials, os_credentials)

            # Set the vault ID in the secret data
            secret_data["vault"]["id"] = vault_id

            # Check if secret already exists
            secret_name = self.settings.op_secret_template.format(asset_id=asset.id)
            existing_secret = await self._find_secret_by_title(vault_id, secret_name)

            async with self._create_http_client() as client:
                if existing_secret:
                    # Update existing secret
                    response = await client.put(
                        f"{self.connect_host}/v1/vaults/{vault_id}/items/{existing_secret['id']}",
                        headers=self._get_headers(),
                        json=secret_data
                    )

                    if response.status_code in [200, 201]:
                        logger.info(f"Updated 1Password secret for asset {asset.hostname}")
                        return existing_secret['id']
                    else:
                        logger.error(f"Failed to update secret: {response.status_code} - {response.text}")
                        raise OnePasswordError(f"Failed to update secret: {response.status_code}")
                else:
                    # Create new secret
                    response = await client.post(
                        f"{self.connect_host}/v1/vaults/{vault_id}/items",
                        headers=self._get_headers(),
                        json=secret_data
                    )

                    if response.status_code in [200, 201]:
                        secret_id = response.json()['id']
                        logger.info(f"Created 1Password secret for asset {asset.hostname}")
                        return secret_id
                    else:
                        logger.error(f"Failed to create secret: {response.status_code} - {response.text}")
                        raise OnePasswordError(f"Failed to create secret: {response.status_code}")

        except OnePasswordError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error in 1Password secret creation: {e}")
            raise OnePasswordError(f"Unexpected error: {e}")

    async def get_asset_secret(self, secret_id: str) -> Dict[str, Any]:
        """Retrieve an asset secret from 1Password"""
        if not self.enabled:
            raise OnePasswordError("1Password integration is not enabled")

        try:
            vault_id = await self.get_vault_id()

            async with self._create_http_client() as client:
                url = f"{self.connect_host}/v1/vaults/{vault_id}/items/{secret_id}"

                response = await client.get(
                    url,
                    headers=self._get_headers()
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get secret: {response.status_code} - {response.text}")
                    raise OnePasswordError(f"Failed to get secret: {response.status_code}")

        except OnePasswordError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error retrieving secret: {e}")
            raise OnePasswordError(f"Unexpected error retrieving secret: {e}")

    async def delete_asset_secret(self, secret_id: str) -> bool:
        """Delete an asset secret from 1Password"""
        if not self.enabled:
            return True

        try:
            vault_id = await self.get_vault_id()

            async with self._create_http_client() as client:
                response = await client.delete(
                    f"{self.connect_host}/v1/vaults/{vault_id}/items/{secret_id}",
                    headers=self._get_headers()
                )

                if response.status_code == 204:
                    logger.info(f"Deleted 1Password secret {secret_id}")
                    return True
                else:
                    raise OnePasswordError(f"Failed to delete secret: {response.status_code}")

        except OnePasswordError:
            raise
        except Exception as e:
            raise OnePasswordError(f"Unexpected error deleting secret: {e}")
