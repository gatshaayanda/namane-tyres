import Image from "next/image";
import Link from "next/link";
import WorkVideo from "@/app/work-video";
import ServicePrices from "@/app/service-prices";

const CUSTOMER_INTRO_MESSAGE = "I found Namane Tyres in Gaborone for tyre fitting and puncture repairs. You can see their services or request help here: https://namane-tyres.vercel.app/. Call 72736456 or 75410091 if you need them.";

const services = [
  ["🔧", "Tyre fitting", "Get tyres fitted and get back on the road."],
  ["🛞", "Puncture repair", "Bring in a puncture and let the team assess it."],
  ["💨", "Pressure check", "Check your tyre pressure before the next trip."],
  ["🚗", "Tyre sales", "Ask about available tyre sizes, brands and prices."],
  ["🧼", "Light wash", "A practical light wash service when available."],
  ["📍", "Roadside assistance", "Request help and share your location when your phone allows it."],
] as const;

export default function Home() {
  return <main className="site">
    <div className="topbar"><div className="container topbarInner"><span>Gaborone</span><strong>Near KFC · Roadside car washes</strong><span>Namane Tyres</span></div></div>
    <nav className="nav"><div className="container navInner"><Link href="/" className="logo"><span className="logoMark">NT</span><span>Namane Tyres</span></Link><div className="navLinks"><a href="#services">Services & prices</a><a href="#work">Our work</a><a href="#location">Find us</a></div><Link href="/book" className="button buttonPrimary">Request Help</Link></div></nav>

    <section className="hero"><div className="container heroGrid"><div><span className="eyebrow">Tyres · Fitting · Repairs</span><h1>Tyre trouble?<br /><em>Let&apos;s sort it.</em></h1><p>Namane Tyres helps drivers with fitting, punctures, pressure checks, tyre sales, light wash services and roadside assistance in Gaborone.</p><div className="actions"><Link href="/book" className="button buttonPrimary">Request Help</Link><a href="#services" className="button buttonLight">See services</a><Link href="/account" className="button buttonLight">My requests</Link><a href={`https://wa.me/?text=${encodeURIComponent(CUSTOMER_INTRO_MESSAGE)}`} className="button buttonLight" target="_blank" rel="noreferrer">Share Namane Tyres</a></div><p className="heroNote">If you are offline, you can still open the app and queue a request on this device.</p></div><div className="heroVisual"><Image src="/namane-assets/work-location.jpg" alt="Namane Tyres work location in Gaborone West Phase 1" fill priority sizes="(max-width: 800px) 100vw, 45vw" /></div></div></section>

    <section id="services" className="section priceSection"><div className="container"><div className="sectionHead"><span className="kicker">What we do</span><h2>Simple tyre help.</h2><p>Choose the service you need, or tell us what is wrong and let the team take it from there. Current prices are shown alongside the services they cover. Contact the team if you need a different service or tyre size.</p></div><ServicePrices descriptions={services} /></div></section>

    <section id="work" className="section workSection"><div className="container"><div className="sectionHead"><span className="kicker">The work</span><h2>Real work, real place.</h2><p>Namane Tyres is a roadside tyre business in Gaborone West Phase 1. These are the people, road and working environment behind the service.</p></div><div className="mediaGrid"><figure className="mediaCard"><Image src="/namane-assets/passing-car.jpg" alt="Roadside view near Namane Tyres" width={1600} height={1000} sizes="(max-width: 800px) 100vw, 50vw" /><figcaption>Roadside location in the neighbourhood.</figcaption></figure><figure className="mediaCard"><WorkVideo /><figcaption>Tyre work at the business.</figcaption></figure></div></div></section>

    <section className="requestBand"><div className="container requestBandInner"><div><span className="kicker">Need a hand?</span><h2>Tell Namane Tyres what&apos;s happening.</h2><p>Give us your name, phone, vehicle and problem. Add your location when useful.</p></div><Link href="/book" className="button buttonPrimary">Request Assistance</Link></div></section>

    <section id="location" className="section locationSection"><div className="container locationGrid"><div><span className="kicker">Find us</span><h2>Near KFC, Gaborone.</h2><p><strong>Roadside, beside the car washes near KFC.</strong></p><p>Call <a href="tel:72736456">72736456</a> or <a href="tel:75410091">75410091</a> for tyre fitting and puncture repairs.</p><p>For directions or a job that needs help on the road, use Request Help and share your location if your phone permits it.</p></div><div className="locationCard"><span>📍</span><strong>Namane Tyres</strong><p>Near KFC<br />By the roadside car washes<br />Gaborone, Botswana</p><div className="actions"><a className="button buttonDark" href="https://www.google.com/maps/search/?api=1&query=Namane%20Tyres%20near%20KFC%20Gaborone%20Botswana">Open directions</a><a className="button buttonLight" href="tel:72736456">Call Namane</a></div></div></div></section>

    <footer className="footer"><div className="container footerInner"><div><strong>Namane Tyres</strong><span>Tyre fitting · Repairs · Sales · Assistance</span></div><div className="footerActions"><a className="footerUtilityLink" href={`https://wa.me/?text=${encodeURIComponent(CUSTOMER_INTRO_MESSAGE)}`} target="_blank" rel="noreferrer">Share Namane Tyres ↗</a><Link href="/account" className="footerUtilityLink">My requests</Link><Link href="/admin" className="footerUtilityLink">Business access <span aria-hidden="true">↗</span></Link><Link href="/book" className="button buttonPrimary">Request Help</Link></div></div></footer>
  </main>;
}
