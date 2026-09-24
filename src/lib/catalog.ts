export type Issuer = "xStocks" | "PreStocks";

export type Category = "pre-ipo" | "index" | "tech" | "crypto" | "classic";

export interface CatalogEntry {
  mint: string;
  /** Plain ticker people recognise, e.g. "AAPL". */
  symbol: string;
  /** On-chain token symbol, e.g. "AAPLx". */
  ticker: string;
  name: string;
  issuer: Issuer;
  category: Category;
  /** Pyth feed symbol for the underlying equity, when one exists. */
  pythEquity?: string;
  /** One-line pitch shown in the picker. */
  blurb?: string;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  "pre-ipo": "Before the IPO",
  index: "Whole market",
  tech: "Big tech",
  crypto: "Crypto economy",
  classic: "Household names",
};

/**
 * Backed xStocks on Solana. Each token is backed 1:1 by the underlying share
 * held with a regulated custodian. Pre-IPO names are loaded live from the
 * PreStocks API instead, so new listings appear without a deploy.
 */
export const XSTOCKS: CatalogEntry[] = [
  { mint: "XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W", symbol: "SPY", ticker: "SPYx", name: "S&P 500", issuer: "xStocks", category: "index", pythEquity: "Equity.US.SPY/USD", blurb: "The 500 largest US companies in one gift" },
  { mint: "Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ", symbol: "QQQ", ticker: "QQQx", name: "Nasdaq 100", issuer: "xStocks", category: "index", pythEquity: "Equity.US.QQQ/USD", blurb: "A hundred of the most innovative companies" },
  { mint: "Xsv9hRk1z5ystj9MhnA7Lq4vjSsLwzL2nxrwmwtD3re", symbol: "GLD", ticker: "GLDx", name: "Gold", issuer: "xStocks", category: "index", pythEquity: "Equity.US.GLD/USD", blurb: "The oldest gift there is, now in a link" },
  { mint: "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh", symbol: "NVDA", ticker: "NVDAx", name: "NVIDIA", issuer: "xStocks", category: "tech", pythEquity: "Equity.US.NVDA/USD", blurb: "The chips behind modern AI" },
  { mint: "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp", symbol: "AAPL", ticker: "AAPLx", name: "Apple", issuer: "xStocks", category: "tech", pythEquity: "Equity.US.AAPL/USD", blurb: "Own a piece of the phone in their pocket" },
  { mint: "XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX", symbol: "MSFT", ticker: "MSFTx", name: "Microsoft", issuer: "xStocks", category: "tech", pythEquity: "Equity.US.MSFT/USD" },
  { mint: "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN", symbol: "GOOGL", ticker: "GOOGLx", name: "Alphabet", issuer: "xStocks", category: "tech", pythEquity: "Equity.US.GOOGL/USD" },
  { mint: "Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg", symbol: "AMZN", ticker: "AMZNx", name: "Amazon", issuer: "xStocks", category: "tech", pythEquity: "Equity.US.AMZN/USD" },
  { mint: "Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu", symbol: "META", ticker: "METAx", name: "Meta", issuer: "xStocks", category: "tech", pythEquity: "Equity.US.META/USD" },
  { mint: "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB", symbol: "TSLA", ticker: "TSLAx", name: "Tesla", issuer: "xStocks", category: "tech", pythEquity: "Equity.US.TSLA/USD" },
  { mint: "XsoBhf2ufR8fTyNSjqfU71DYGaE6Z3SUGAidpzriAA4", symbol: "PLTR", ticker: "PLTRx", name: "Palantir", issuer: "xStocks", category: "tech", pythEquity: "Equity.US.PLTR/USD" },
  { mint: "Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu", symbol: "COIN", ticker: "COINx", name: "Coinbase", issuer: "xStocks", category: "crypto", pythEquity: "Equity.US.COIN/USD" },
  { mint: "XsvNBAYkrDRNhA7wPHQfX3ZUXZyZLdnCQDfHZ56bzpg", symbol: "HOOD", ticker: "HOODx", name: "Robinhood", issuer: "xStocks", category: "crypto", pythEquity: "Equity.US.HOOD/USD" },
  { mint: "XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1", symbol: "CRCL", ticker: "CRCLx", name: "Circle", issuer: "xStocks", category: "crypto", pythEquity: "Equity.US.CRCL/USD" },
  { mint: "XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ", symbol: "MSTR", ticker: "MSTRx", name: "Strategy", issuer: "xStocks", category: "crypto", pythEquity: "Equity.US.MSTR/USD" },
  { mint: "XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2", symbol: "MCD", ticker: "MCDx", name: "McDonald's", issuer: "xStocks", category: "classic", pythEquity: "Equity.US.MCD/USD", blurb: "Their favourite fries, now with dividends" },
  { mint: "Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc", symbol: "GME", ticker: "GMEx", name: "GameStop", issuer: "xStocks", category: "classic", pythEquity: "Equity.US.GME/USD" },
];

export const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
export const SOL_MINT = "So11111111111111111111111111111111111111112";

export const PAY_TOKENS = [
  { mint: USDC_MINT, symbol: "USDC", decimals: 6 },
  { mint: SOL_MINT, symbol: "SOL", decimals: 9 },
] as const;

export type PayToken = (typeof PAY_TOKENS)[number];
