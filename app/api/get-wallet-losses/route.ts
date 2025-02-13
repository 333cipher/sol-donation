// app/api/get-wallet-losses/route.ts
//import { Flipside } from '@flipsidecrypto/sdk';
import { NextResponse } from 'next/server';

// Mock mode flag - set in .env.local:
// MOCK_DATA=true
const MOCK_MODE = process.env.MOCK_DATA === 'true';

// Only initialize Flipside if not in mock mode
// let flipside;
// if (!MOCK_MODE) {
//   const API_KEY = process.env.FLIPSIDE_API_KEY;
//   if (!API_KEY) {
//     console.error("Flipside API key is not set in the environment variables.");
//   }
//   flipside = new Flipside(API_KEY!, "https://api-v2.flipsidecrypto.xyz");
// }

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet_address = searchParams.get('wallet_address');

  if (!wallet_address) {
    return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
  }

  // Mock data response - no API calls
  if (MOCK_MODE) {
    return NextResponse.json({
      losses: 2701681.28 // Your sample value
    });
  }

  /* *************** REAL IMPLEMENTATION (COMMENTED OUT) *************** 
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60);
  const START_DATE = startDate.toISOString().split('T')[0];

  const walletLossesSql = `
    WITH PRICE_HISTORY AS (
        SELECT token_address,
               hour,
               price,
               LAG(price, 1) OVER (
                   PARTITION BY token_address
                   ORDER BY hour
               ) AS previous_price,
               price / NULLIF(previous_price, 0) AS price_ratio
        FROM solana.price.ez_prices_hourly p
        WHERE hour >= '${START_DATE}'
            AND is_imputed = FALSE
    ),

    ANOMALY_FILTER AS (
        SELECT hour::date AS trade_date,
               token_address
        FROM PRICE_HISTORY
        WHERE price_ratio >= 10 OR price_ratio <= 0.1
    ),

    HOURLY_PRICES AS (
        SELECT p.token_address AS token_mint,
               DATE_TRUNC('hour', p.hour) AS hour,
               AVG(price) AS price
        FROM solana.price.ez_prices_hourly p
        LEFT JOIN ANOMALY_FILTER af
            ON af.token_address = p.token_address
            AND af.trade_date = p.hour::date
        WHERE hour >= '${START_DATE}'
            AND af.trade_date IS NULL
            AND is_imputed = FALSE
            AND price < 1000000
        GROUP BY 1, 2
    ),

    DAILY_PRICES AS (
        SELECT p.token_address AS token_mint,
               DATE_TRUNC('day', hour) AS date,
               AVG(price) AS price
        FROM solana.price.ez_prices_hourly p
        LEFT JOIN ANOMALY_FILTER af
            ON af.token_address = p.token_address
            AND af.trade_date = p.hour::date
        WHERE hour >= '${START_DATE}'
            AND af.trade_date IS NULL
            AND is_imputed = FALSE
            AND price < 1000000
        GROUP BY 1, 2
    ),

    WEEKLY_PRICES AS (
        SELECT p.token_address AS token_mint,
               DATE_TRUNC('week', hour) AS week,
               AVG(price) AS price
        FROM solana.price.ez_prices_hourly p
        LEFT JOIN ANOMALY_FILTER af
            ON af.token_address = p.token_address
            AND af.trade_date = p.hour::date
        WHERE hour >= '${START_DATE}'
            AND af.trade_date IS NULL
            AND is_imputed = FALSE
            AND price < 1000000
        GROUP BY 1, 2
    ),

    LATEST_PRICES AS (
        SELECT token_mint,
               price AS current_price
        FROM HOURLY_PRICES
        QUALIFY ROW_NUMBER() OVER (PARTITION BY token_mint ORDER BY hour DESC) = 1
    ),

    LATEST_SWAP_PRICES AS (
        SELECT swap_to_mint,
               swap_to_amount,
               swap_from_mint,
               swap_from_amount,
               p.current_price * s.swap_from_amount / s.swap_to_amount AS calc_price
        FROM solana.defi.fact_swaps s
        JOIN LATEST_PRICES p
            ON LEFT(p.token_mint, 16) = LEFT(s.swap_from_mint, 16)
        WHERE block_timestamp >= CURRENT_DATE - 1
            AND succeeded
            AND swap_to_amount > 0
            AND swap_from_amount > 0
        QUALIFY ROW_NUMBER() OVER (PARTITION BY swap_to_mint ORDER BY block_timestamp DESC) = 1
    ),

    BASE_TRADES AS (
        SELECT tx_id,
               swapper AS wallet_address,
               block_timestamp,
               swap_from_mint,
               swap_to_mint,
               swap_from_amount,
               swap_to_amount
        FROM solana.defi.fact_swaps
        WHERE block_timestamp >= '${START_DATE}'
            AND succeeded = TRUE
            AND swap_to_amount > 0
            AND swap_from_amount > 0
            AND swapper = '${wallet_address}'
    ),

    TRADE_VALUES AS (
        SELECT t.*,
               COALESCE(h_from.price, d_from.price, w_from.price) AS from_price,
               COALESCE(h_to.price, d_to.price, w_to.price) AS to_price,
               t.swap_from_amount * COALESCE(h_from.price, d_from.price, w_from.price) AS from_value_usd,
               t.swap_to_amount * COALESCE(h_to.price, d_to.price, w_to.price) AS to_value_usd,
               CASE 
                   WHEN t.swap_to_mint IN (
                       'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
                       'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                       'So11111111111111111111111111111111111111112'
                   ) THEN t.swap_to_amount * COALESCE(h_to.price, d_to.price, w_to.price)
                   WHEN t.swap_from_mint IN (
                       'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
                       'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                       'So11111111111111111111111111111111111111112'
                   ) THEN t.swap_from_amount * COALESCE(h_from.price, d_from.price, w_from.price)
                   ELSE LEAST(
                       t.swap_from_amount * COALESCE(h_from.price, d_from.price, w_from.price),
                       t.swap_to_amount * COALESCE(h_to.price, d_to.price, w_to.price)
                   )
               END AS trade_value
        FROM BASE_TRADES t
        LEFT JOIN HOURLY_PRICES h_from
            ON LEFT(h_from.token_mint, 16) = LEFT(t.swap_from_mint, 16)
            AND h_from.hour = DATE_TRUNC('hour', t.block_timestamp)
        LEFT JOIN HOURLY_PRICES h_to
            ON LEFT(h_to.token_mint, 16) = LEFT(t.swap_to_mint, 16)
            AND h_to.hour = DATE_TRUNC('hour', t.block_timestamp)
        LEFT JOIN DAILY_PRICES d_from
            ON LEFT(d_from.token_mint, 16) = LEFT(t.swap_from_mint, 16)
            AND d_from.date = DATE_TRUNC('day', t.block_timestamp)
        LEFT JOIN DAILY_PRICES d_to
            ON LEFT(d_to.token_mint, 16) = LEFT(t.swap_to_mint, 16)
            AND d_to.date = DATE_TRUNC('day', t.block_timestamp)
        LEFT JOIN WEEKLY_PRICES w_from
            ON LEFT(w_from.token_mint, 16) = LEFT(t.swap_from_mint, 16)
            AND w_from.week = DATE_TRUNC('week', t.block_timestamp)
        LEFT JOIN WEEKLY_PRICES w_to
            ON LEFT(w_to.token_mint, 16) = LEFT(t.swap_to_mint, 16)
            AND w_to.week = DATE_TRUNC('week', t.block_timestamp)
        WHERE from_value_usd >= 4 OR to_value_usd >= 4
    ),

    TOKEN_FLOWS AS (
        SELECT wallet_address,
               tx_id,
               block_timestamp,
               swap_from_mint AS token_mint,
               swap_from_amount AS amount,
               0 AS n_buys,
               1 AS n_sales,
               0 AS amount_bought,
               swap_from_amount AS amount_sold,
               -swap_from_amount AS net_amount,
               0 AS usd_bought,
               trade_value AS usd_sold
        FROM TRADE_VALUES
        
        UNION ALL
        
        SELECT wallet_address,
               tx_id,
               block_timestamp,
               swap_to_mint AS token_mint,
               swap_to_amount AS amount,
               1 AS n_buys,
               0 AS n_sales,
               swap_to_amount AS amount_bought,
               0 AS amount_sold,
               swap_to_amount AS net_amount,
               trade_value AS usd_bought,
               0 AS usd_sold
        FROM TRADE_VALUES
    ),

    TOKEN_SUMMARY AS (
        SELECT wallet_address,
               token_mint,
               SUM(usd_bought) AS total_bought_usd,
               SUM(usd_sold) AS total_sold_usd,
               SUM(amount_bought) AS total_tokens_bought,
               SUM(amount_sold) AS total_tokens_sold,
               GREATEST(SUM(net_amount), 0) AS current_balance,
               SUM(n_buys) AS buy_count,
               SUM(n_sales) AS sell_count
        FROM TOKEN_FLOWS
        GROUP BY 1, 2
    ),

    FINAL_METRICS AS (
        SELECT ts.*,
               CASE WHEN total_tokens_sold = 0 THEN 0 ELSE LEAST(1, total_tokens_bought / total_tokens_sold) END AS realized_ratio,
               COALESCE(lp.current_price, lsp.calc_price, 0) AS current_price,
               ROUND(ts.current_balance * COALESCE(lp.current_price, lsp.calc_price, 0), 2) AS unrealized_value_usd,
               ROUND((total_sold_usd * CASE WHEN total_tokens_sold = 0 THEN 0 ELSE LEAST(1, total_tokens_bought / total_tokens_sold) END) 
                   - total_bought_usd + (current_balance * COALESCE(lp.current_price, lsp.calc_price, 0)), 2) AS profit_loss_usd,
               m.name AS token_name,
               UPPER(m.symbol) AS token_symbol
        FROM TOKEN_SUMMARY ts
        LEFT JOIN LATEST_PRICES lp
            ON LEFT(lp.token_mint, 16) = LEFT(ts.token_mint, 16)
        LEFT JOIN LATEST_SWAP_PRICES lsp
            ON LEFT(lsp.swap_to_mint, 16) = LEFT(ts.token_mint, 16)
        LEFT JOIN solana.price.ez_asset_metadata m
            ON m.token_address = ts.token_mint
        QUALIFY ROW_NUMBER() OVER (PARTITION BY ts.token_mint ORDER BY m.modified_timestamp DESC) = 1
    )

    SELECT SUM(ABS(profit_loss_usd)) as total_losses_usd
    FROM FINAL_METRICS
    WHERE token_mint NOT IN (
        'So11111111111111111111111111111111111111112',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    )
    AND profit_loss_usd < 0;
  `;

  try {
    console.log("Executing Flipside query for wallet:", wallet_address);
    const result = await flipside.query.run({
      sql: walletLossesSql,
      timeoutMinutes: 10,
      cached: true
    });

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({
        losses: 0,
        message: "No trading activity found for this wallet"
      });
    }

    return NextResponse.json({
      losses: result.rows[0][0] || 0
    });
  } catch (error) {
    console.error("Error fetching data from Flipside:", error);
    return NextResponse.json(
      { 
        error: 'An error occurred while fetching data from Flipside',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
  *************** END OF REAL IMPLEMENTATION *************** */

  // Fallback mock response (always safe)
  return NextResponse.json({
    losses: 2701681.28
  });
}