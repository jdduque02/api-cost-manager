import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { FinancialAsset } from '@banking/entities/financial-asset.entity';

export type QuoteSource = 'yahoo' | 'coingecko';

export interface LiveQuote {
  symbol: string;
  price: number;
  currency: string;
}

export interface AssetQuoteResult extends LiveQuote {
  asset_id: number;
  name: string;
  success: boolean;
}

/** Mapeo de símbolos cripto comunes a IDs de CoinGecko. */
const COINGECKO_IDS: Record<string, string> = {
  USDT: 'tether',
  USDC: 'usd-coin',
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  BNB: 'binancecoin',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  TRX: 'tron',
  LINK: 'chainlink',
  AVAX: 'avalanche-2',
  MATIC: 'matic-network',
};

@Injectable()
export class MarketDataService {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(private readonly httpService: HttpService) {}

  async fetchQuote(
    symbol: string,
    source: QuoteSource = 'yahoo',
  ): Promise<LiveQuote> {
    if (source === 'coingecko') {
      return this.fetchCoinGecko(symbol);
    }
    return this.fetchYahoo(symbol);
  }

  async refreshQuotes(assets: FinancialAsset[]): Promise<AssetQuoteResult[]> {
    return Promise.all(
      assets.map(async (asset) => {
        const symbol = asset.symbol?.trim();
        if (!symbol) {
          return {
            asset_id: asset.id,
            name: asset.name,
            symbol: asset.symbol ?? '',
            price: 0,
            currency: asset.currency,
            success: false,
          };
        }
        try {
          const quote = await this.fetchQuote(
            symbol,
            (asset.quote_source as QuoteSource) ?? 'yahoo',
          );
          return {
            asset_id: asset.id,
            name: asset.name,
            symbol,
            price: quote.price,
            currency: quote.currency,
            success: true,
          };
        } catch (err) {
          this.logger.warn(
            `Fallo cotización ${symbol}: ${(err as Error).message}`,
          );
          return {
            asset_id: asset.id,
            name: asset.name,
            symbol,
            price: 0,
            currency: asset.currency,
            success: false,
          };
        }
      }),
    );
  }

  private async fetchYahoo(symbol: string): Promise<LiveQuote> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const res = await firstValueFrom(
      this.httpService.get(url, { timeout: 8000 }),
    );
    const meta = res.data?.chart?.result?.[0]?.meta;
    if (!meta || typeof meta.regularMarketPrice !== 'number') {
      throw new Error(`No se pudo obtener la cotización de ${symbol}`);
    }
    return {
      symbol,
      price: meta.regularMarketPrice,
      currency: meta.currency ?? 'USD',
    };
  }

  private async fetchCoinGecko(symbol: string): Promise<LiveQuote> {
    const id = COINGECKO_IDS[symbol.toUpperCase()];
    if (!id) {
      throw new Error(`Símbolo cripto no soportado: ${symbol}`);
    }
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`;
    const res = await firstValueFrom(
      this.httpService.get(url, { timeout: 8000 }),
    );
    const price = res.data?.[id]?.usd;
    if (typeof price !== 'number') {
      throw new Error(`No se pudo obtener la cotización de ${symbol}`);
    }
    return { symbol, price, currency: 'USD' };
  }
}
