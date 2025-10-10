"""Common app tests."""

from django.test import TestCase, Client
from django.urls import reverse


class HealthEndpointTest(TestCase):
    """Tests for the health endpoint."""

    def setUp(self):
        self.client = Client()

    def test_health_endpoint(self):
        """Test that the health endpoint returns 200 and database status."""
        response = self.client.get(reverse('common:health'))
        self.assertEqual(response.status_code, 200)
        self.assertIn('status', response.data)
        self.assertIn('db', response.data)
