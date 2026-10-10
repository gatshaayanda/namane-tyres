"use client";

import { useEffect, useState } from "react";
import { DEFAULT_SERVICE_PRICES, getServicePrices, type ServicePrice } from "@/lib/firebase/data";

export default function ServicePrices() {
  const [services, setServices] = useState<ServicePrice[]>(DEFAULT_SERVICE_PRICES);

  useEffect(() => {
    let active = true;
    void getServicePrices().then((items) => {
      if (active) setServices(items);
    }).catch(() => {
      // Keep the supplied starting prices visible if the network is unavailable.
    });
    return () => { active = false; };
  }, []);

  return (
    <div className="cards servicePriceCards">
      {services.map((service) => (
        <article className="card servicePriceCard" key={service.id}>
          <span className="kicker">Service</span>
          <h3>{service.name}</h3>
          <strong className="servicePriceAmount">P{service.price.toFixed(2)}</strong>
        </article>
      ))}
    </div>
  );
}
