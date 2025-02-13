import { Flipside } from '@flipsidecrypto/sdk';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.FLIPSIDE_API_KEY;
if (!API_KEY) {
  console.error("Flipside API key is not set in the environment variables.");
}
const flipside = new Flipside(API_KEY, "https://api-v2.flipsidecrypto.xyz");

export const handler = async function(event) {
  // Get wallet address from query parameters
  const { wallet_address } = event.queryStringParameters;
  if (!wallet_address) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Wallet address is required' })
    };
  }

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
      WHERE hour >= CURRENT_DATE - 365
          AND is_imputed = FALSE
    ),

    TRADE_VALUES AS (
      SELECT t.*,
             COALESCE(h_from.price, d_from.price, w_from.price) AS from_price,
             COALESCE(h_to.price, d_to.price, w_to.price) AS to_price,
             t.swap_from_amount * COALESCE(h_from.price, d_from.price, w_from.price) AS from_value_usd,
             t.swap_to_amount * COALESCE(h_to.price, d_to.price, w_to.price) AS to_value_usd
      FROM solana.defi.fact_swaps t
      WHERE swapper = '${wallet_address}'
      AND block_timestamp >= CURRENT_DATE - 365
    )

    SELECT 
      SUM(CASE 
        WHEN from_value_usd > to_value_usd THEN from_value_usd - to_value_usd 
        ELSE 0 
      END) as total_losses_usd
    FROM TRADE_VALUES
    WHERE from_value_usd > 0 AND to_value_usd > 0;
  `;

  try {
    const result = await flipside.query.run({
      sql: walletLossesSql,
      timeoutMinutes: 10,
      cached: true
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        losses: result.rows[0].TOTAL_LOSSES_USD || 0
      })
    };
  } catch (error) {
    console.error("Error fetching data from Flipside:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'An error occurred while fetching data from Flipside' })
    };
  }
};