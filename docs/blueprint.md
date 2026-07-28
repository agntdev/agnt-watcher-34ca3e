# CryptoWatch — Bot specification

**Archetype:** custom

**Voice:** professional and concise — write every user-facing message, button label, error, and empty state in this voice.

A private Telegram bot for tracking cryptocurrency prices with customizable alerts, quiet hours, and optional morning summaries. Users manage watchlists and receive precise price threshold/percentage alerts while the owner gains analytics on usage patterns and alert frequency.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- individual crypto traders
- privacy-conscious Telegram users
- crypto market analysts

## Success criteria

- users successfully manage personalized watchlists with 95% accuracy
- alert suppression during quiet hours with 100% compliance
- owner receives daily metrics dashboard with top 10 alerts

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Initialize onboarding and display main menu with watchlist/alert options
- **/price** (command, actor: user, command: /price) — Check current price of specific coin or full watchlist
  - inputs: ticker symbol, list
  - outputs: current price with % change
- **Add Coin** (button, actor: user, callback: watchlist:add) — Add new coin to watchlist with confirmation for unknown tickers
- **Create Alert** (button, actor: user, callback: alert:create) — Configure price threshold or percentage move alert

## Flows

### Onboarding Setup
_Trigger:_ /start

1. Display quiet hours defaults
2. Request morning summary preference
3. Seed watchlist buttons

_Data touched:_ User

### Price Alert Creation
_Trigger:_ alert:create

1. Select coin
2. Choose alert type
3. Set parameters
4. Confirm schedule

_Data touched:_ AlertRule

### Daily Summary
_Trigger:_ scheduled_local_time

1. Generate price summary
2. Apply quiet hours filter
3. Send to opted-in users

_Data touched:_ User, WatchlistEntry

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Telegram account with private settings
  - fields: telegram_id, timezone, quiet_hours, summary_time, opt_in_status
- **WatchlistEntry** _(retention: persistent)_ — Tracked cryptocurrency
  - fields: ticker, display_name, user_id
- **AlertRule** _(retention: persistent)_ — Price alert configuration
  - fields: type, parameters, enabled, cool_down_state, user_id
- **NotificationRecord** _(retention: persistent)_ — Alert delivery tracking
  - fields: alert_rule_id, user_id, last_alert_time, cooldown_until
- **OwnerMetrics** _(retention: persistent)_ — Aggregated analytics
  - fields: user_count, top_alerts, alert_fire_counts

## Integrations

- **Telegram** (required) — Bot API messaging
- **Crypto Price Feed** (required) — Market data
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- View daily metrics dashboard
- Adjust default quiet hours
- Modify alert cooldown rules

## Notifications

- Morning price summary
- Price threshold alerts
- Percentage move alerts

## Permissions & privacy

- All user data encrypted at rest
- No third-party data sharing
- User consent required for metrics tracking

## Edge cases

- Invalid ticker suggestions
- Price feed outages
- Timezone conversion errors
- Concurrent alert rule updates

## Required tests

- Alert suppression during quiet hours
- Cooldown escalation sequence
- Multi-coin percentage change calculation

## Assumptions

- Default quiet hours 00:00-08:00
- 1-hour lookback for percentage alerts
- No paid features by default
