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
  const [basket, setBasket] = useState<ServicePrice[]>([]);
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
  const basketNames = basket.map((price) => price.name);
  const assistanceHref = basket.length
    ? `/book?services=${encodeURIComponent(basketNames.join(" | "))}`
    : "/book";

  function addToBasket(price: ServicePrice) {
    setBasket((current) => current.some((item) => item.id === price.id) ? current : [...current, price]);
  }
  function removeFromBasket(id: string) {
    setBasket((current) => current.filter((item) => item.id !== id));
  }

  function priceAction(price: ServicePrice) {
    const added = basket.some((item) => item.id === price.id);
    return <button className={`button ${added ? "buttonAdded" : "buttonPrimary"} serviceAddButton`} type="button" onClick={() => added ? removeFromBasket(price.id) : addToBasket(price)} aria-pressed={added}>
      {added ? "✓ Added · Remove" : "＋ Add to basket"}
    </button>;
  }

  return (
    <div className="serviceDiscovery">
      <label className="serviceSearch">
        <span aria-hidden="true">⌕</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a service or price…" aria-label="Search services and prices" />
        {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">Clear</button>}
      </label>

      {basket.length > 0 && <section className="serviceBasket" aria-live="polite" aria-label="Selected services">
        <div className="basketHeading"><div><span className="kicker">Your selection</span><h3>Basket <span className="basketCount">{basket.length}</span></h3></div><button type="button" className="basketClear" onClick={() => setBasket([])}>Clear basket</button></div>
        <ul>{basket.map((price) => <li key={price.id}><span>{price.name}</span><strong>P{price.price.toFixed(2)}</strong><button type="button" onClick={() => removeFromBasket(price.id)} aria-label={`Remove ${price.name} from basket`}>×</button></li>)}</ul>
        <p>These are your selected services, not a confirmed booking. Continue to tell Namane Tyres about your vehicle and what you need.</p>
        <Link href={assistanceHref} className="button buttonPrimary">Continue to Request Assistance ↗</Link>
      </section>}

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
            </div> : <Link href="/book" className="button buttonLight serviceAskButton">Ask about this service ↗</Link>}
          </article>
        ))}
        {visibleAdditionalPrices.map((price) => <article className="card serviceCombinedCard" key={price.id}>
          <div className="cardIcon">🧾</div><span className="kicker">Published price</span><h3>{price.name}</h3>
          <strong className="servicePriceAmount">P{price.price.toFixed(2)}</strong>{priceAction(price)}
        </article>)}
      </div>
      {visibleServices.length === 0 && visibleAdditionalPrices.length === 0 && <p className="serviceNoResults">No matching service or price. Try another search, or <Link href="/book">request assistance</Link>.</p>}
      <div className="serviceBottomAction"><p>Need help choosing? Tell the team what is happening and they can review your request.</p><Link href={basket.length ? assistanceHref : "/book"} className="button buttonPrimary">{basket.length ? "Request Assistance with selection" : "Request Assistance"} ↗</Link></div>
    </div>
  );
}
