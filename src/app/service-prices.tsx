"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SERVICE_PRICES, getServicePrices, type ServicePrice } from "@/lib/firebase/data";

type ServiceDescription = readonly [string, string, string];

export default function ServicePrices({ descriptions }: { descriptions: readonly ServiceDescription[] }) {
  const [prices, setPrices] = useState<ServicePrice[]>(DEFAULT_SERVICE_PRICES);

  useEffect(() => {
    let active = true;
    void getServicePrices().then((items) => {
      if (active) setPrices(items);
    }).catch(() => {
      // Keep the seeded fallback prices visible if the network is unavailable.
    });
    return () => { active = false; };
  }, []);

  const usedPriceIds = new Set<string>();
  function pricesFor(title: string) {
    const titleKey = title.trim().toLowerCase();
    const matched = prices.filter((price) => {
      const name = price.name.trim().toLowerCase();
      if (titleKey === "puncture repair") return /patch|puncture repair/.test(name) || /patch/.test(price.id);
      return name === titleKey || price.id === titleKey.replace(/\s+/g, "-");
    });
    matched.forEach((price) => usedPriceIds.add(price.id));
    return matched;
  }

  return (
    <div className="cards serviceCombinedCards">
      {descriptions.map(([icon, title, detail]) => {
        const matchedPrices = pricesFor(title);
        return (
          <article className="card serviceCombinedCard" key={title}>
            <div className="cardIcon">{icon}</div>
            <h3>{title}</h3>
            <p>{detail}</p>
            {matchedPrices.length > 0 && (
              <div className="servicePriceInline">
                <span className="kicker">{matchedPrices.length > 1 ? "Published prices" : "Current price"}</span>
                {matchedPrices.map((price) => (
                  <div className="servicePriceLine" key={price.id}>
                    <span>{price.name}</span>
                    <strong>P{price.price.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            )}
          </article>
        );
      })}
      {prices.filter((price) => !usedPriceIds.has(price.id)).map((price) => (
        <article className="card serviceCombinedCard" key={price.id}>
          <div className="cardIcon">🧾</div>
          <span className="kicker">Published price</span>
          <h3>{price.name}</h3>
          <strong className="servicePriceAmount">P{price.price.toFixed(2)}</strong>
        </article>
      ))}
    </div>
  );
}
