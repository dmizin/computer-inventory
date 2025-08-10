"""
1Password Connect integration service - FIXED VERSION
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
            # Disable SSL verification entirely
            logger.warning("SSL verification disabled for 1Password Connect - use only for testing!")
            return False
        elif self.settings.op_ssl_cert_file:
            # Use custom CA certificate file
            logger.info(f"Using custom CA certificate: {self.settings.op_ssl_cert_file}")
            return self.settings.op_ssl_cert_file
        else:
            # Use default SSL verification
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
                # Updated to use the correct health endpoint
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
        """Get vault ID by name - FIXED: Now properly async"""
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

    def _build_secret_data(self, asset: Asset, mgmt_controller: Optional[ManagementController] = None,
                          mgmt_credentials: Optional[Dict[str, str]] = None,
                          os_credentials: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        """Build 1Password secret data structure - FIXED: Updated for current API"""
        secret_name = self.settings.op_secret_template.format(asset_id=asset.id)

        # Get management defaults based on controller type
        mgmt_defaults = {'username': 'admin', 'password': 'changeme'}
        if mgmt_controller and mgmt_controller.type in self.mgmt_defaults:
            mgmt_defaults = self.mgmt_defaults[mgmt_controller.type]

        # Build secret fields using updated API structure
        fields = [
            {"id": "asset_name", "label": "Asset Name", "type": "STRING", "value": asset.hostname},
            {"id": "asset_id", "label": "Asset ID", "type": "STRING", "value": str(asset.id)},
            {"id": "asset_fqdn", "label": "Asset FQDN", "type": "STRING", "value": asset.fqdn or ""},
            {"id": "asset_location", "label": "Asset Location", "type": "STRING", "value": asset.location or ""}
        ]

        # Add management controller credentials
        if mgmt_controller:
            mgmt_user = mgmt_credentials.get('username') if mgmt_credentials else mgmt_defaults['username']
            mgmt_pass = mgmt_credentials.get('password') if mgmt_credentials else mgmt_defaults['password']

            fields.extend([
                {"id": "mgmt_type", "label": "Management Type", "type": "STRING", "value": mgmt_controller.type},
                {"id": "mgmt_address", "label": "Management Address", "type": "STRING", "value": mgmt_controller.address},
                {"id": "mgmt_port", "label": "Management Port", "type": "STRING", "value": str(mgmt_controller.port)},
                {"id": "mgmt_ui_url", "label": "Management UI URL", "type": "STRING", "value": mgmt_controller.ui_url or ""},
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

        # Add OS credentials
        os_user = os_credentials.get('username') if os_credentials else 'root'
        os_pass = os_credentials.get('password') if os_credentials else 'changeme'
        os_ssh_key = os_credentials.get('ssh_key') if os_credentials else ''

        fields.extend([
            {"id": "os_username", "label": "OS Username", "type": "STRING", "value": os_user},
            {"id": "os_password", "label": "OS Password", "type": "CONCEALED", "value": os_pass},
            {"id": "os_ssh_key", "label": "OS SSH Key", "type": "STRING", "value": os_ssh_key}
        ])

        return {
            "title": secret_name,
            "category": "LOGIN",
            "vault": {"id": ""},  # Will be filled in by create_or_update_asset_secret
            "fields": fields,
            "tags": ["computer-inventory", "asset", asset.type]
        }

    async def _find_secret_by_title(self, vault_id: str, secret_name: str) -> Optional[Dict[str, Any]]:
        """Find secret by title in vault - FIXED: Proper API usage"""
        async with self._create_http_client() as client:
            # Use the filter parameter as documented in the API
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
        """Create or update 1Password secret for an asset - FIXED: Updated API calls"""
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
                    # Update existing secret - Use PUT for full replacement
                    response = await client.put(
                        f"{self.connect_host}/v1/vaults/{vault_id}/items/{existing_secret['id']}",
                        headers=self._get_headers(),
                        json=secret_data
                    )

                    # Accept both 200 and 201 as success for updates
                    if response.status_code in [200, 201]:
                        logger.info(f"Updated 1Password secret for asset {asset.hostname}")
                        return existing_secret['id']
                    else:
                        logger.error(f"Failed to update secret: {response.status_code} - {response.text}")
                        raise OnePasswordError(f"Failed to update secret: {response.status_code}")
                else:
                    # Create new secret - Use POST
                    response = await client.post(
                        f"{self.connect_host}/v1/vaults/{vault_id}/items",
                        headers=self._get_headers(),
                        json=secret_data
                    )

                    # Accept both 200 and 201 as success for creation
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
                logger.info(f"Retrieving secret from URL: {url}")

                response = await client.get(
                    url,
                    headers=self._get_headers()
                )

                if response.status_code == 200:
                    return response.json()
                else:
                    logger.error(f"Failed to get secret: {response.status_code} - {response.text}")
                    # Also try to list all items to see if the secret exists with a different name
                    logger.info("Attempting to list vault items to debug...")
                    list_response = await client.get(
                        f"{self.connect_host}/v1/vaults/{vault_id}/items",
                        headers=self._get_headers()
                    )
                    if list_response.status_code == 200:
                        items = list_response.json()
                        logger.info(f"Found {len(items)} items in vault")
                        for item in items:
                            if item.get('id') == secret_id:
                                logger.info(f"Found matching item: {item.get('title')}")
                                break
                        else:
                            logger.warning(f"Secret ID {secret_id} not found in vault items")

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
