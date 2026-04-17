"use client";

import {
  ColorType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { useEffect, useRef } from "react";

import type { Bar } from "@/lib/types/market";

type Props = {
  bars: Bar[];
  height?: number;
};

/**
 * Candlestick + volume chart using TradingView's lightweight-charts.
 *
 * We theme it via the Nord palette exposed as CSS variables. Grid and axes
 * are deliberately subtle — the data is the point, not the chrome.
 */
export function PriceChart({ bars, height = 340 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  // Initialize once
  useEffect(() => {
    if (!containerRef.current) return;

    const styles = getComputedStyle(document.documentElement);
    const color = (name: string) => styles.getPropertyValue(name).trim();

    const chart = createChart(containerRef.current, {
      height,
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: color("--bg-raised") },
        textColor: color("--fg-subtle"),
        fontFamily: "var(--font-mono)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: color("--border-subtle") },
        horzLines: { color: color("--border-subtle") },
      },
      rightPriceScale: {
        borderColor: color("--border-subtle"),
      },
      timeScale: {
        borderColor: color("--border-subtle"),
        timeVisible: false,
      },
      crosshair: {
        mode: 1, // Magnet mode
      },
    });

    const candle = chart.addCandlestickSeries({
      upColor: color("--signal-up"),
      downColor: color("--signal-down"),
      borderUpColor: color("--signal-up"),
      borderDownColor: color("--signal-down"),
      wickUpColor: color("--signal-up"),
      wickDownColor: color("--signal-down"),
    });

    const volume = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      color: color("--accent-blue"),
    });
    volume.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candle;
    volumeRef.current = volume;

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, [height]);

  // Update data whenever bars change
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current) return;

    const candleData = bars.map((b) => ({
      time: toTime(b.timestamp),
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close,
    }));

    // Color volume bars to match candle direction
    const styles = getComputedStyle(document.documentElement);
    const up = styles.getPropertyValue("--signal-up").trim();
    const down = styles.getPropertyValue("--signal-down").trim();

    const volumeData = bars.map((b) => ({
      time: toTime(b.timestamp),
      value: b.volume,
      color: b.close >= b.open ? `${up}40` : `${down}40`, // alpha via hex
    }));

    candleRef.current.setData(candleData);
    volumeRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [bars]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}

function toTime(iso: string): Time {
  // lightweight-charts accepts YYYY-MM-DD for daily data
  return iso.slice(0, 10) as Time;
}
