# Scout

**Know who you’re copying before you copy.** Scout scans any Strike wallet and tells you how it really trades, what it costs, and whether you could realistically copy it.

Live app: https://scout-six-swart.vercel.app

## The problem

Strike’s leaderboard ranks traders by profit. It doesn’t tell you whether you can actually copy them. Some top wallets make hundreds of thousands of trades, so your copies would arrive after the price has moved. Profit alone is not a safe reason to copy someone.

## What Scout does

Paste a wallet address (Cardano, Ethereum or Solana) or an account ID. Scout shows:

- **Trader type and verdict**, with one plain-English line explaining why
- **Copyability score (0 to 100)**, lowered by bot-like speed, high leverage, liquidations, big drops from the peak and other warnings
- **Key numbers:** win rate (after fees), biggest profit drop, liquidations, fees, net funding, fills per day, average leverage
- **Fee saver:** a rough estimate of what more limit orders could save, with its assumptions shown
- **Copy estimate:** a rough "if you copied with $X" result for the sampled fills, with assumptions shown
- **Compare mode:** two wallets side by side with a "which is easier to copy" line
- **Scout Board:** save wallets in your browser and see them ranked by copyability (the saved list stays on your device)
- **Bot detection with visible signals:** fills per day, typical gap between fills, repeated trade sizes, and round-the-clock trading, listed on the card so the verdict is checkable
- **Scorecard image** and share text, with an optional referral link
- A short guided tour and "what’s this?" tips for beginners

## How Scout uses Strike

Scout reads public data from Strike’s REST API (api.strikefinance.org), selected by wallet address or account ID. Calls go through a small server route (/api/strike) so the browser is never blocked.

| Endpoint | Used for |
| --- | --- |
| /v2/history/fill | Latest 1,000 fills: PnL, fees, maker/taker, leverage, liquidations, trading pace |
| /v2/portfolio | Profit history, account value, fee tier |
| /v2/history/funding | Net funding paid or received |

Scout never asks for keys or trading access. It only reads public data.

## Honest limits

- Most numbers come from the **latest 1,000 fills**, which can cover less than a day for very active wallets.
- Fee saver and copy estimate are **estimates**. Their assumptions are shown on screen, including a guessed delay cost that is not measured.
- Funding covers the latest 1,000 funding payments.
- Scout shows data, not financial advice.

## Run it locally

    git clone https://github.com/BenCoy09/scout
    cd scout
    npm install
    npm run dev

Open http://localhost:3000. Stack: Next.js, TypeScript, Tailwind, deployed on Vercel.

## Roadmap

Alerts, copyability score history, builder-code monetization, and a leaderboard of the most copyable wallets across all of Strike.
