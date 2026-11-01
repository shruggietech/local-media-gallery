// SPDX-License-Identifier: Apache-2.0
import { model } from '../lib/model';
import { landingDocs } from '../lib/navigation.mjs';
function Landscape({ scene }: { scene: number }) {
  return (
    <svg viewBox="0 0 320 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="240" fill="var(--secondary)" />
      <circle
        cx={scene % 2 ? 250 : 80}
        cy={scene % 2 ? 60 : 84}
        r={scene === 2 ? 58 : 32}
        fill="var(--chart-4)"
      />
      <path
        d={scene % 2 ? 'M-30 240 110 60 200 180 280 100 380 240Z' : 'M-30 240 70 130 160 190 260 80 380 240Z'}
        fill="var(--chart-3)"
      />
      <path d="M-30 250 70 180Q150 120 220 195T380 195V260Z" fill="var(--chart-1)" />
      <path
        d={scene === 3 ? 'M0 240V180Q120 220 320 170V240Z' : 'M0 240V225Q140 160 320 225V240Z'}
        fill="var(--brand-accent-deep)"
      />
    </svg>
  );
}
export default function Home() {
  const docs = landingDocs(model.manifest);
  return (
    <div className="landing">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="status-dot" />
            {model.release ? 'Version ' + model.release.version : 'IN DEVELOPMENT'}
            <span className="eyebrow-rule" />
          </p>
          <h1 id="hero-title">
            Your media
            <br />
            presented
            <br />
            <em>beautifully.</em>
          </h1>
          <p className="lead">A lightweight, interactive gallery for browsing local images and videos.</p>
          <div className="landing-actions">
            <a className="primary-link" href="/docs/">
              Read the documentation <span aria-hidden="true">↗</span>
            </a>
            <a className="secondary-link" href="https://github.com/shruggietech/local-media-gallery">
              Explore the source <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <figure className="gallery-preview">
          <div className="preview-toolbar">
            <span>
              <i />
              <i />
              <i />
            </span>
            <span>weekend / selects</span>
            <span>6 items</span>
          </div>
          <div className="contact-sheet">
            {['ridge.jpg', 'afterlight.jpg', 'dunes.jpg', 'shore.mp4', 'summit.jpg', 'stillwater.jpg'].map(
              (name, i) => (
                <div className={'preview-tile tile-' + i} key={name}>
                  <Landscape scene={i} />
                  <span className="tile-label">
                    {name}
                    {i === 3 ? <span>▶ 00:18</span> : null}
                  </span>
                </div>
              ),
            )}
          </div>
          <figcaption>
            <span>ILLUSTRATIVE GALLERY PREVIEW</span>
            <span>Images and video, together.</span>
          </figcaption>
        </figure>
      </section>
      <section className="workflow" aria-labelledby="workflow-title">
        <div className="section-heading">
          <p className="eyebrow">FROM FOLDER TO FOCUS</p>
          <h2 id="workflow-title">
            From folder
            <br />
            to gallery.
          </h2>
          <p>
            Start with a directory of media. Browse the collection, then give an image or video the space it
            deserves.
          </p>
        </div>
        <ol>
          {[
            {
              title: 'Open a folder',
              text: 'Choose a directory of local images and videos. The originals stay where you keep them.',
              href: docs.overview,
            },
            {
              title: 'Find your rhythm',
              text: 'Move through the collection as a gallery, with images and videos in one view.',
              href: docs.interfaces,
            },
            {
              title: 'Keep it in focus',
              text: 'Open an item for a closer look, then return to the collection without losing your place.',
              href: docs.interfaces,
            },
          ].map((step, i) => (
            <li key={step.title}>
              <span className="step-number">0{i + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
              <a href={step.href} aria-label={'Read about ' + step.title.toLowerCase()}>
                ↗
              </a>
            </li>
          ))}
        </ol>
      </section>
      <section className="editions" aria-labelledby="availability">
        <div>
          <p className="eyebrow">A LOCAL STARTING POINT</p>
          <h2 id="availability">
            Choose how
            <br />
            you browse.
          </h2>
          <p>{model.release ? 'Available for the qualified Windows, Linux and macOS targets below.' : 'Being built for Windows, Linux and macOS.'}</p>
        </div>
        <div className="edition-list">
          <div>
            <span className="edition-label">FULL</span>
            <h3>Make it part of your desktop.</h3>
            <p>{model.release ? 'For frequent use, system integration and persistent user settings.' : 'Intended for frequent use, system integration and persistent user settings.'}</p>
          </div>
          <div>
            <span className="edition-label">LITE</span>
            <h3>Open a gallery in place.</h3>
            <p>{model.release ? 'Open a portable gallery on a supported host, with your own presentation choices.' : 'Intended for a portable gallery on a supported host, with an optional sharing workflow.'}</p>
          </div>
          {model.release ? (
            <ul>
              {model.release.artifacts.map((a) => (
                <li key={a.url}>
                  <a href={a.url}>
                    Download {a.edition} for {a.platform} ({a.architecture})
                  </a>
                  <code>SHA-256 {a.sha256}</code>
                </li>
              ))}
            </ul>
          ) : (
            <p className="availability-note">
              No installable Full or Lite packages have been published. The documentation describes the{' '}
              {docs.version} specification baseline; platform packages remain in development.
            </p>
          )}
        </div>
      </section>
      <section className="reading-prompt">
        <p className="eyebrow">EXPLORE THE DETAILS</p>
        <h2>
          Explore the
          <br />
          documentation.
        </h2>
        <a className="primary-link" href={docs.overview}>
          Read the product overview <span aria-hidden="true">↗</span>
        </a>
      </section>
    </div>
  );
}
