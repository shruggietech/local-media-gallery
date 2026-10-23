# Research: Public website deployment

## 2026-10-23

- Decision: Reuse active Cloudflare full zone and existing locked, auto-renewing registration. Rationale: verified authorized preflight, no existing DNS or CAA records, no zone/registrar write required. Alternatives: new zone or transfer introduces unnecessary state changes.
- Decision: Publish apex DNS-only with official A/AAAA values; preserve existing unsigned DNSSEC state and verify public DS/NS. Rationale: Pages serves TLS directly; no proxy dependency. Alternatives: Cloudflare proxy or new DNSSEC activation are outside the necessary change.
- Decision: Organization Pages TXT verification precedes repository custom-domain assignment and web DNS. Rationale: ownership binding and authoritative provider state; a CNAME file is ignored for custom Actions deployment.
- Decision: Existing Qualification workflow gains a gated Pages job. Rationale: new workflow_dispatch files cannot run before reaching the default branch, while exact PR environment policy supports authorized pre-merge production deployment. All three existing jobs must pass first.
- Decision: Pin current official actions, not lagging examples: configure-pages v6.0.0 45bfe0192ca1faeb007ade9deae92b16b8254a0d; upload-pages-artifact v5.0.0 fc324d3547104276b827a68afc52ff2a11cc49c9; deploy-pages v5.0.1 368f82528645a54fb793d4d04e342629a3f51346. Include checked hidden files; do not let configure-pages modify generator configuration.
- Decision: Keep rollback journals private and require exact current-state preconditions. Rationale: preserve concurrent unrelated changes and credential/contact privacy. Retain previous successful artifact for content recovery.
- Two read-only research agents independently examined Pages publication and DNS/provider contracts. Their findings were consolidated here.

## Primary references

- [GitHub custom workflow deployment](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Pages custom domains and exact destinations](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [Organization Pages domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [Pages REST configuration](https://docs.github.com/en/rest/pages/pages)
- [Environment deployment policies](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
- [Cloudflare DNS-only](https://developers.cloudflare.com/dns/proxy-status/)
- [Cloudflare DNS batch propagation](https://developers.cloudflare.com/dns/manage-dns-records/how-to/batch-record-changes/)
- [Cloudflare DNSSEC troubleshooting](https://developers.cloudflare.com/dns/dnssec/troubleshooting/)
- [Official Pages upload action](https://github.com/actions/upload-pages-artifact)
- [Official Pages deployment action](https://github.com/actions/deploy-pages)
