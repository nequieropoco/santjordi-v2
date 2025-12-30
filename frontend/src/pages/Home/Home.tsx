import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home">
      <header className="home__header">
        <div className="home__container home__headerInner">
          <div className="home__brand">
            <span className="home__brandMark" aria-hidden="true">
              SJ
            </span>
            <div className="home__brandText">
              <strong>Bar Sant Jordi</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="home__main">
        <section className="home__hero">
          <div className="home__container">
            <div className="home__actions">
              <Link className="home__action" to="/carta" aria-label="Veure carta">
                <div className="home__actionBadge" aria-hidden="true">
                  {/* Badge/logo Carta */}
                  <svg viewBox="0 0 24 24" className="home__badgeIcon">
                    <path
                      d="M6 3h9a2 2 0 0 1 2 2v16H6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z"
                      fill="currentColor"
                      opacity="0.18"
                    />
                    <path
                      d="M6 3h11a2 2 0 0 1 2 2v15a1 1 0 0 1-1 1H6a3 3 0 0 0-3 3V5a2 2 0 0 1 2-2h1zm0 2H5v14.17A4.98 4.98 0 0 1 6 19h11V5H6zm2 3h7v2H8V8zm0 4h7v2H8v-2z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                <div className="home__actionBtn">
                  <svg viewBox="0 0 24 24" className="home__btnIcon" aria-hidden="true">
                    <path
                      d="M6 3h9a2 2 0 0 1 2 2v16H6a2 2 0 0 0-2 2V5a2 2 0 0 1 2-2z"
                      fill="currentColor"
                      opacity="0.18"
                    />
                    <path
                      d="M6 3h11a2 2 0 0 1 2 2v15a1 1 0 0 1-1 1H6a3 3 0 0 0-3 3V5a2 2 0 0 1 2-2h1zm0 2H5v14.17A4.98 4.98 0 0 1 6 19h11V5H6zm2 3h7v2H8V8z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>VER CARTA</span>
                </div>
              </Link>

              <Link className="home__action" to="/sugerencias" aria-label="Veure sugerències">
                <div className="home__actionBadge" aria-hidden="true">
                  {/* Badge/logo Sugerencias */}
                  <svg viewBox="0 0 24 24" className="home__badgeIcon">
                    <path
                      d="M12 2a7 7 0 0 0-4 12.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26A7 7 0 0 0 12 2z"
                      fill="currentColor"
                      opacity="0.18"
                    />
                    <path
                      d="M12 4a5 5 0 0 0-2.86 9.1 1 1 0 0 1-.44.9V17h6v-3a1 1 0 0 1-.44-.9A5 5 0 0 0 12 4zm-2 15h4v1a2 2 0 0 1-4 0v-1z"
                      fill="currentColor"
                    />
                  </svg>
                </div>

                <div className="home__actionBtn">
                  <svg viewBox="0 0 24 24" className="home__btnIcon" aria-hidden="true">
                    <path
                      d="M12 2a7 7 0 0 0-4 12.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26A7 7 0 0 0 12 2z"
                      fill="currentColor"
                      opacity="0.18"
                    />
                    <path
                      d="M12 4a5 5 0 0 0-2.86 9.1 1 1 0 0 1-.44.9V17h6v-3a1 1 0 0 1-.44-.9A5 5 0 0 0 12 4z"
                      fill="currentColor"
                    />
                  </svg>
                  <span>VER SUGERENCIAS</span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <footer className="home__footer">
          <div className="home__container home__footerInner">
            <span>© {new Date().getFullYear()} Bar Sant Jordi</span>
            <span className="home__footerLinks">
              <a href="#" onClick={(e) => e.preventDefault()}>
                Aviso legal
              </a>
              <span className="home__footerDot">•</span>
              <a href="#" onClick={(e) => e.preventDefault()}>
                Cookies
              </a>
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
