import { useBrand } from "../runtime/brand";

export const Footer = () => {
  const { brand } = useBrand();
  return (
    <footer className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>
      <div className="flex space-between" style={{ flexWrap: "wrap" }}>
        <div className="muted small">{brand.copy.tagline}</div>
        <div className="link-row">
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
