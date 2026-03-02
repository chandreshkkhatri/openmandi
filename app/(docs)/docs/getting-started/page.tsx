import Link from "next/link";

export default function GettingStarted() {
  return (
    <article className="prose prose-invert max-w-none prose-headings:text-white prose-a:text-primary hover:prose-a:text-primary-light">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
        Guide
      </p>
      <h1>Getting Started with Open Mandi</h1>

      <p className="lead">
        Open Mandi is an academic cryptocurrency-based commodities exchange
        where you can trade gold and silver futures using USDC. This guide
        will walk you through everything you need to get up and running.
      </p>

      <h2>What is Open Mandi?</h2>
      <p>
        Open Mandi is a learning-focused trading platform. It lets you
        experience how a real commodities exchange works, but in a safe,
        low-stakes environment. You trade with small amounts of USDC and can
        buy and sell futures contracts for gold and silver.
      </p>
      <p>
        Because this is an academic project, we&apos;ve designed it with strict
        limits to keep things safe and educational. You can&apos;t deposit more
        than $5 at a time, and you need to keep your balance small. The focus is
        on learning, not on making money.
      </p>

      <h2>Step 1: Create Your Account</h2>
      <p>
        Sign up with your email address and create a password. Once your account
        is set up, you&apos;ll have access to the exchange dashboard where you
        can see your balances, markets, and trading tools.
      </p>

      <h2>Step 2: Make Your First Deposit</h2>
      <p>
        To start trading, you need to deposit some funds. Open Mandi accepts
        USDC.
      </p>
      <p>There are a couple of rules to keep in mind:</p>
      <ul>
        <li>
          You can deposit a <strong>maximum of $5</strong> per deposit
        </li>
        <li>
          You can only deposit when your account balance is{" "}
          <strong>below $5</strong>
        </li>
      </ul>
      <p>
        These limits are intentional. They keep the platform educational and
        low-risk. You can read more about why in our{" "}
        <Link href="/docs/deposits-withdrawals">
          Deposits &amp; Withdrawals guide
        </Link>
        .
      </p>

      <h2>Step 3: Explore the Dashboard</h2>
      <p>
        Your dashboard is your home base. From here, you can see your current
        balance in USDC, view the markets for gold and silver futures,
        and access all the tools you need.
      </p>

      <h2>Step 4: Explore Futures Markets</h2>
      <p>
        Navigate to Gold Futures or Silver Futures to inspect order books,
        current mark prices, and funding data before placing your first trade.
      </p>

      <h2>Step 5: Make Your First Trade</h2>
      <p>
        Navigate to either the Gold Futures or Silver Futures market. You&apos;ll
        see an order book showing what other traders are willing to buy and sell
        at. You can:
      </p>
      <ul>
        <li>
          <strong>Go long</strong> &mdash; buy a futures contract if you think
          the price will go up
        </li>
        <li>
          <strong>Go short</strong> &mdash; sell a futures contract if you think
          the price will go down
        </li>
      </ul>
      <p>
        Don&apos;t worry if this sounds complicated &mdash; our{" "}
        <Link href="/docs/futures-contracts">Futures Contracts guide</Link>{" "}
        explains everything in plain English.
      </p>

      <h2>Step 6: Monitor Your Positions</h2>
      <p>
        After placing a trade, you can track your open positions in the Positions
        &amp; Orders page. You&apos;ll see your entry price, current
        profit/loss, and you can close your position at any time.
      </p>

      <h2>Withdrawing Your Funds</h2>
      <p>
        When you&apos;re ready to withdraw, there&apos;s one rule: your account
        balance must be <strong>at least $10</strong>. This threshold exists to
        encourage active participation and learning before withdrawing.
      </p>

      <h2>What&apos;s Next?</h2>
      <p>Now that you know the basics, explore these topics to learn more:</p>
      <ul>
        <li>
          <Link href="/docs/what-is-commodities">
            What is a Commodities Exchange?
          </Link>
        </li>
        <li>
          <Link href="/docs/futures-contracts">
            Understanding Futures Contracts
          </Link>
        </li>
        <li>
          <Link href="/docs/fees">Fee Structure</Link>
        </li>
      </ul>
    </article>
  );
}
