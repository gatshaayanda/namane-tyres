"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SERVICE_PRICES, getServicePrices, type ServicePrice } from "@/lib/firebase/data";

type ServiceDescription = readonly [string, string, string];

function matchesPrice(title: string, price: ServicePrice) {
  const titleKey = title.trim().toLowerCase();
  const name = price.name.trim().toLowerCase();
  if (titleKey === "puncture repair") return /patch|puncture repair/.test(name) || /patch/.test(price.id);
  return name === titleKey || price.id === titleKey.replace(/\s+/g, "-");
}

export default function ServicePrices({ descriptions }: { descriptions: readonly ServiceDescription[] }) {
  const [prices, setPrices] = useState<ServicePrice[]>(DEFAULT_SERVICE_PRICES);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    void getServicePrices().then((items) => {
      if (active) setPrices(items);
    }).catch(() => {
      // Keep the seeded fallback prices visible if the network is unavailable.
    });
    return () => { active = false; };
  }, []);

  const describedServices = useMemo(() => descriptions.map(([icon, title, detail]) => ({
    icon,
    title,
    detail,
    matchedPrices: prices.filter((price) => matchesPrice(title, price)),
  })), [descriptions, prices]);
  const additionalPrices = prices.filter((price) =>
    !describedServices.some((service) => service.matchedPrices.some((matched) => matched.id === price.id)),
  );
  const query = search.trim().toLowerCase();
  const visibleServices = describedServices.filter(({ title, detail, matchedPrices }) =>
    !query || [title, detail, ...matchedPrices.map((price) => price.name)].some((value) => value.toLowerCase().includes(query)),
  );
  const visibleAdditionalPrices = additionalPrices.filter((price) => !query || price.name.toLowerCase().includes(query));
  function requestServiceHref(serviceName: string) {
    return `/book?services=${encodeURIComponent(serviceName)}`;
  }

  function priceAction(price: ServicePrice) {
    return <Link href={requestServiceHref(price.name)} className="button buttonPrimary serviceAddButton">Request this service ↗</Link>;
  }

  return (
    <div className="serviceDiscovery">
      <label className="serviceSearch">
        <span aria-hidden="true">⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a service or price…" aria-label="Search services and prices" />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">Clear</button>}
      </label>

      <div className="cards serviceCombinedCards">
        {visibleServices.map(({ icon, title, detail, matchedPrices }) => (
          <article className="card serviceCombinedCard" key={title}>
            <div className="cardIcon">{icon}</div>
            <h3>{title}</h3>
            <p>{detail}</p>
            {matchedPrices.length > 0 ? <div className="servicePriceInline">
              <span className="kicker">{matchedPrices.length > 1 ? "Published prices" : "Current price"}</span>
              {matchedPrices.map((price) => <div className="servicePriceLine servicePriceItem" key={price.id}>
                <div><span>{price.name}</span><strong>P{price.price.toFixed(2)}</strong></div>
                {priceAction(price)}
              </div>)}
            </div> : <Link href={requestServiceHref(title)} className="button buttonPrimary serviceAskButton">Request this service ↗</Link>}
          </article>
        ))}
        {visibleAdditionalPrices.map((price) => <article className="card serviceCombinedCard" key={price.id}>
          <div className="cardIcon">🧾</div><span className="kicker">Published price</span><h3>{price.name}</h3>
          <strong className="servicePriceAmount">P{price.price.toFixed(2)}</strong>{priceAction(price)}
        </article>)}
      </div>
      {visibleServices.length === 0 && visibleAdditionalPrices.length === 0 && <p className="serviceNoResults">No matching service or price. Try another search, or <Link href="/book">request assistance</Link>.</p>}
      <div className="serviceBottomAction"><p>Not sure which service you need? Describe the problem and the team can help you choose.</p><Link href="/book" className="button buttonPrimary">Describe what you need ↗</Link></div>
    </div>
  );
}
