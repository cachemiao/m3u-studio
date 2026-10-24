"""Test-only access to local HTTP fixtures; production never permits loopback."""

from network_policy import AddressPolicy


class LocalHTTPPolicy(AddressPolicy):
    def allows(self, value):
        return value == "127.0.0.1" or super().allows(value)
