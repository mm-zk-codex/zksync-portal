import { useBrand } from "../runtime/brand";

export const Footer = () => {
  const { brand } = useBrand();
  return (
    <footer className="container footer" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <div className="footer-row">
        <div className="muted small footer-text">{brand.copy.tagline}</div>
        <div className="link-row footer-links">
          {brand.copy.footerLinks.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
};
