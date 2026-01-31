#!/bin/bash
# Script to seed January 2026 data for device SMRT-G6M-E0Q on Render
# Run this script after deploying to Render

echo "=========================================="
echo "Seeding January 2026 sensor data"
echo "Device: SMRT-G6M-E0Q"
echo "=========================================="
echo ""

# Run the management command
python manage.py seed_jan2026_data --device-serial SMRT-G6M-E0Q --readings-per-day 8

echo ""
echo "=========================================="
echo "Data seeding complete!"
echo "=========================================="
