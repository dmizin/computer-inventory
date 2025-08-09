"""
1Password Connect integration service
"""
import httpx
import json
import logging
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime

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

    async def test_connectivity(self) -> bool:
        """Test 1Password Connect connectivity and token validity"""
        if not self.enabled:
            return True

        if not self.connect_host or not self.api_token:
            raise OnePasswordError("1Password Connect host or API token not configured")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.connect_host}/v1/heartbeat",
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
        async with httpx.AsyncClient(timeout=self.timeout) as client:
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
        """Build 1Password secret data structure"""
        secret_name = self.settings.op_secret_template.format(asset_id=asset.id)

        # Get management defaults based on controller type
        mgmt_defaults = {'username': 'admin', 'password': 'changeme'}
        if mgmt_controller and mgmt_controller.type in self.mgmt_defaults:
            mgmt_defaults = self.mgmt_defaults[mgmt_controller.type]

        # Build secret fields
        fields = [
            {"label": "asset_name", "value": asset.hostname, "type": "STRING"},
            {"label": "asset_id", "value": str(asset.id), "type": "STRING"},
            {"label": "asset_fqdn", "value": asset.fqdn or "", "type": "STRING"},
            {"label": "asset_location", "value": asset.location or "", "type": "STRING"}
        ]

        # Add management controller credentials
        if mgmt_controller:
            mgmt_user = mgmt_credentials.get('username') if mgmt_credentials else mgmt_defaults['username']
            mgmt_pass = mgmt_credentials.get('password') if mgmt_credentials else mgmt_defaults['password']

            fields.extend([
                {"label": "mgmt_type", "value": mgmt_controller.type, "type": "STRING"},
                {"label": "mgmt_address", "value": mgmt_controller.address, "type": "STRING"},
                {"label": "mgmt_port", "value": str(mgmt_controller.port), "type": "STRING"},
                {"label": "mgmt_ui_url", "value": mgmt_controller.ui_url or "", "type": "STRING"},
                {"label": "mgmt_username", "value": mgmt_user, "type": "STRING"},
                {"label": "mgmt_password", "value": mgmt_pass, "type": "PASSWORD"}
            ])
        else:
            # Add empty management fields as placeholders
            fields.extend([
                {"label": "mgmt_type", "value": "", "type": "STRING"},
                {"label": "mgmt_address", "value": "", "type": "STRING"},
                {"label": "mgmt_port", "value": "", "type": "STRING"},
                {"label": "mgmt_ui_url", "value": "", "type": "STRING"},
                {"label": "mgmt_username", "value": "admin", "type": "STRING"},
                {"label": "mgmt_password", "value": "changeme", "type": "PASSWORD"}
            ])

        # Add OS credentials
        os_user = os_credentials.get('username') if os_credentials else 'root'
        os_pass = os_credentials.get('password') if os_credentials else 'changeme'
        os_ssh_key = os_credentials.get('ssh_key') if os_credentials else 'changeme'

        fields.extend([
            {"label": "os_username", "value": os_user, "type": "STRING"},
            {"label": "os_password", "value": os_pass, "type": "PASSWORD"},
            {"label": "os_ssh_key", "value": os_ssh_key, "type": "SSH_KEY"}
        ])

        return {
            "title": secret_name,
            "category": "LOGIN",
            "fields": fields,
            "tags": ["computer-inventory", "asset", asset.type]
        }

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

            # Check if secret already exists
            secret_name = self.settings.op_secret_template.format(asset_id=asset.id)
            existing_secret = await self._find_secret_by_title(vault_id, secret_name)

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                if existing_secret:
                    # Update existing secret
                    response = await client.put(
                        f"{self.connect_host}/v1/vaults/{vault_id}/items/{existing_secret['id']}",
                        headers=self._get_headers(),
                        json=secret_data
                    )

                    if response.status_code == 200:
                        logger.info(f"Updated 1Password secret for asset {asset.hostname}")
                        return existing_secret['id']
                    else:
                        raise OnePasswordError(f"Failed to update secret: {response.status_code}")
                else:
                    # Create new secret
                    response = await client.post(
                        f"{self.connect_host}/v1/vaults/{vault_id}/items",
                        headers=self._get_headers(),
                        json=secret_data
                    )

                    if response.status_code == 201:
                        secret_id = response.json()['id']
                        logger.info(f"Created 1Password secret for asset {asset.hostname}")
                        return secret_id
                    else:
                        raise OnePasswordError(f"Failed to create secret: {response.status_code}")

        except OnePasswordError:
            raise
        except Exception as e:
            raise OnePasswordError(f"Failed to create/update asset secret: {e}")

    async def _find_secret_by_title(self, vault_id: str, title: str) -> Optional[Dict[str, Any]]:
        """Find secret by title in vault"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.connect_host}/v1/vaults/{vault_id}/items",
                headers=self._get_headers(),
                params={"filter": f"title eq \"{title}\""}
            )

            if response.status_code == 200:
                items = response.json()
                return items[0] if items else None

            return None

    async def get_asset_credentials(self, asset_id: UUID) -> Optional[Dict[str, Any]]:
        """Retrieve credentials for an asset from 1Password"""
        if not self.enabled:
            return None

        try:
            vault_id = await self.get_vault_id()
            secret_name = self.settings.op_secret_template.format(asset_id=asset_id)

            secret = await self._find_secret_by_title(vault_id, secret_name)
            if not secret:
                return None

            # Get full secret details
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(
                    f"{self.connect_host}/v1/vaults/{vault_id}/items/{secret['id']}",
                    headers=self._get_headers()
                )

                if response.status_code == 200:
                    secret_data = response.json()

                    # Convert fields to dict
                    credentials = {}
                    for field in secret_data.get('fields', []):
                        credentials[field['label']] = field['value']

                    return credentials
                else:
                    return None

        except Exception as e:
            logger.error(f"Failed to get asset credentials: {e}")
            return None
