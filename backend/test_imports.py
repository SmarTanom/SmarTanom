# Test imports
try:
    import django
    from django.apps import AppConfig
    from django.contrib import admin
    from django.contrib.auth import get_user_model
    from django.db import models
    from django.urls import path
    import rest_framework
    from rest_framework import serializers
    from rest_framework.decorators import api_view
    from rest_framework.permissions import IsAuthenticated
    from rest_framework.response import Response
    from rest_framework.routers import DefaultRouter
    import django_filters
    print("All imports successful!")
except ImportError as e:
    print(f"Import error: {e}")
