# Scout

**Know who you’re copying before you copy.** Scout scans any Strike wallet and tells you how it really trades, what it costs, and whether you could realistically copy it.

Live app: https://scout-six-swart.vercel.app

## The problem

Strike’s leaderboard ranks traders by profit. It doesn’t tell you whether you can actually copy them. Some top wallets make hundreds of thousands of trades, so your copies would arrive after the price has moved. Profit alone is not a safe reason to copy someone.

## What Scout does

Paste a wallet address (Cardano, Ethereum or Solana) or an account ID. Scout shows:

- **Trader type and verdict**, with one plain-English line explaining why
- **Copyability score (0 to 100):** starts at 100 and drops for bot-like trading, very high activity, high leverage, liquidations, big drops from the profit peak and other warnings
- **Bot detection with visible signals:** a wallet is flagged if it makes more than 300 fills a day, or shows at least two of these: a typical gap between fills under 2 seconds, over 30% of fills at the exact same size, or trading in every hour of the day. The card lists which signals fired, so the verdict is checkable
- **Key numbers:** win rate (after fees), biggest profit drop, liquidations, fees, net funding, fills per day, average leverage
- **Fee saver:** a rough estimate of what more limit orders could save, with its assumptions shown
- **Copy estimate:** a rough "if you copied with $X" result for the sampled fills, with assumptions shown
- **Compare mode:** two wallets side by side with a "which is easier to copy" line
- **Scout Board (/board):** save wallets and see them ranked by copyability. Saved wallets live in your own browser only
- **Scorecard image** and share text, both carrying the Scout link, plus an optional Strike referral link
- A short guided tour and "what’s this?" tips for beginners

## How Scout uses Strike

Scout reads public data from Strike’s REST API (api.strikefinance.org), selected by wallet address or account ID. Calls go through a small server route (/api/strike) so the browser is never blocked.

| Endpoint | Used for |
| --- | --- |
| /v2/history/fill | Latest 1,000 fills: PnL, fees, maker/taker, leverage, liquidations, trading pace and patterns |
| /v2/portfolio | Profit history, account value, fee tier |
| /v2/history/funding | Net funding paid or received |

Scout never asks for keys or trading access. It only reads public data.

## Honest limits

- Most numbers come from the **latest 1,000 fills**, which can cover less than a day for very active wallets.
- Fee saver and copy estimate are **estimates**. Their assumptions are shown on screen, including a guessed delay cost that is not measured.
- Funding covers the latest 1,000 funding payments.
- Bot detection is a set of signals, not proof.
- The Scout Board is saved in your browser, so it does not follow you across devices.
- Scout shows data, not financial advice.

## Run it locally

    git clone https://github.com/BenCoy09/scout
    cd scout
    npm install
    npm run dev

Open http://localhost:3000. Stack: Next.js, TypeScript, Tailwind, deployed on Vercel.

## Roadmap

Alerts when a saved wallet changes behavior, copyability score history over time, boards that sync across devices, builder-code monetization, and a leaderboard of the most copyable wallets across all of Strike.
