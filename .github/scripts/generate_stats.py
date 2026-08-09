import os
import requests
import xml.etree.ElementTree as ET

TOKEN = os.environ['GITHUB_TOKEN']
USERNAME = os.environ['GH_USERNAME']

query = '''
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}
'''

variables = {
    "login": USERNAME,
    "from": "2026-01-01T00:00:00Z",
    "to": "2026-12-31T23:59:59Z"
}

headers = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

r = requests.post('https://api.github.com/graphql', json={'query': query, 'variables': variables}, headers=headers)
r.raise_for_status()
data = r.json()

calendar = data['data']['user']['contributionsCollection']['contributionCalendar']
total = calendar['totalContributions']
days = []
for week in calendar['weeks']:
    for day in week['contributionDays']:
        days.append((day['date'], day['contributionCount']))

# Calculate current and longest streak
current_streak = 0
longest_streak = 0
temp_streak = 0

# Count current streak from most recent day backwards
for date, count in reversed(days):
    if count > 0:
        current_streak += 1
    else:
        break

# Longest streak
for date, count in days:
    if count > 0:
        temp_streak += 1
        longest_streak = max(longest_streak, temp_streak)
    else:
        temp_streak = 0

# Generate SVG
svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="495" height="195" viewBox="0 0 495 195" role="img" aria-label="GitHub Stats">
  <rect width="495" height="195" rx="4.5" fill="#0d1117"/>
  <text x="30" y="45" fill="#58a6ff" font-family="Segoe UI, Ubuntu, sans-serif" font-size="18" font-weight="600">GitHub Stats</text>

  <text x="82.5" y="115" fill="#FEFEFE" font-family="Segoe UI, Ubuntu, sans-serif" font-size="32" font-weight="700" text-anchor="middle">{total}</text>
  <text x="82.5" y="140" fill="#7d8590" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" text-anchor="middle">Total Contributions</text>
  <text x="82.5" y="158" fill="#7d8590" font-family="Segoe UI, Ubuntu, sans-serif" font-size="10" font-weight="400" text-anchor="middle">2026</text>

  <text x="247.5" y="115" fill="#FEFEFE" font-family="Segoe UI, Ubuntu, sans-serif" font-size="32" font-weight="700" text-anchor="middle">{current_streak}</text>
  <text x="247.5" y="140" fill="#7d8590" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" text-anchor="middle">Current Streak</text>
  <text x="247.5" y="158" fill="#7d8590" font-family="Segoe UI, Ubuntu, sans-serif" font-size="10" font-weight="400" text-anchor="middle">days</text>

  <text x="412.5" y="115" fill="#58a6ff" font-family="Segoe UI, Ubuntu, sans-serif" font-size="32" font-weight="700" text-anchor="middle">{longest_streak}</text>
  <text x="412.5" y="140" fill="#7d8590" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" text-anchor="middle">Longest Streak</text>
  <text x="412.5" y="158" fill="#7d8590" font-family="Segoe UI, Ubuntu, sans-serif" font-size="10" font-weight="400" text-anchor="middle">days</text>
</svg>
'''

with open('stats.svg', 'w', encoding='utf-8') as f:
    f.write(svg)

print(f'Generated stats.svg: total={total}, current_streak={current_streak}, longest_streak={longest_streak}')
