(() => {
    let initialUpdateDone = false;
    // URL to copy for the current page, or null when sosumi.ai cannot serve it.
    let sosumiUrl = null;
    // Pathname that sosumiUrl was resolved for (SPA navigation changes it without reload).
    let checkedPath = null;

    const jsonExists = async (url) => {
        try {
            const res = await fetch(url, { method: 'HEAD' });
            return res.ok;
        } catch {
            return false;
        }
    };

    // Mirrors the preconditions of sosumi.ai's routes (sosumi.ai/src/index.ts):
    // each branch checks the same JSON/DOM that sosumi.ai fetches for that route.
    const resolveSosumiUrl = async () => {
        const { hostname, origin } = window.location;
        // sosumi.ai redirects trailing slashes and rejects fragments, so drop both (and the query).
        const path = window.location.pathname.replace(/\/+$/, '');
        let m;

        if (hostname === 'developer.apple.com') {
            // lib/reference/fetch.ts: framework roots use /index/<framework>, other pages <path>.json
            if ((m = path.match(/^\/documentation\/(.+)$/))) {
                const docPath = m[1];
                const jsonUrl = docPath.includes('/')
                    ? `/tutorials/data/documentation/${docPath}.json`
                    : `/tutorials/data/index/${docPath}`;
                return (await jsonExists(jsonUrl)) ? `https://sosumi.ai${path}` : null;
            }
            // lib/hig/fetch.ts
            if (path === '/design/human-interface-guidelines') {
                return (await jsonExists('/tutorials/data/index/design--human-interface-guidelines'))
                    ? `https://sosumi.ai${path}`
                    : null;
            }
            if ((m = path.match(/^\/design\/human-interface-guidelines\/(.+)$/))) {
                return (await jsonExists(`/tutorials/data/design/human-interface-guidelines/${m[1]}.json`))
                    ? `https://sosumi.ai${path}`
                    : null;
            }
            // index.ts /videos/play/:collection/:id + lib/video: needs a #transcript-content section.
            // sosumi.ai has no locale routes and always reads the English page, so localized pages
            // (/jp/, /kr/, ...) map to the English URL and are checked against the English page.
            if ((m = path.match(/^(\/[a-z-]+)?(\/videos\/play\/[a-z0-9-]+\/\d+)$/i))) {
                const videoPath = m[2];
                let hasTranscript;
                if (m[1]) {
                    try {
                        const res = await fetch(`${videoPath}/`);
                        hasTranscript = res.ok && /<section[^>]*id=["']transcript-content["']/i.test(await res.text());
                    } catch {
                        hasTranscript = false;
                    }
                } else {
                    hasTranscript = !!document.getElementById('transcript-content');
                }
                return hasTranscript ? `https://sosumi.ai${videoPath}` : null;
            }
            return null;
        }

        // External Swift-DocC (lib/external/fetch.ts buildExternalDocCJsonUrl): <base>/data/documentation/....json
        if ((m = path.match(/^(.*?)(\/documentation\/.+)$/))) {
            return (await jsonExists(`${m[1]}/data${m[2]}.json`))
                ? `https://sosumi.ai/external/${origin}${path}`
                : null;
        }
        return null;
    };

    const updatePosition = () => {
        const container = document.getElementById('sosumi-container');
        if (!container) return;

        const globalHeader = document.querySelector('.global-header');
        const localNav = document.querySelector('.nav.documentation-nav, .nav--fullwidth-border, nav.nav');

        let totalOffset = 12;

        if (localNav) {
            const rect = localNav.getBoundingClientRect();
            if (rect.bottom > 0) {
                totalOffset = rect.bottom + 12;
            }
        } else if (globalHeader) {
            const rect = globalHeader.getBoundingClientRect();
            if (rect.bottom > 0) {
                totalOffset = rect.bottom + 12;
            }
        }

        // Disable transition for the very first placement to prevent "sliding in" from fallback
        if (!initialUpdateDone) {
            container.style.transition = 'none';
            container.style.top = `${totalOffset}px`;
            // Trigger reflow
            container.offsetHeight;
            container.style.transition = ''; // Restore CSS transition
            container.classList.add('visible');
            initialUpdateDone = true;
        } else {
            container.style.top = `${totalOffset}px`;
        }
    };

    const injectButton = () => {
        if (document.getElementById('sosumi-container')) {
            updatePosition();
            return;
        }

        const container = document.createElement('div');
        container.id = 'sosumi-container';
        // Initially hide until first position is calculated
        container.style.opacity = '0';


        container.innerHTML = `
      <div class="sosumi-logo-container">
        <svg class="sosumi-logo" viewBox="0 0 24 24" fill="currentColor">
          <path d="M21.72 4.575V0H10.29v1.14H5.715v1.148H2.287v8.002h-1.14v2.28H0V24h24V4.575zM5.715 22.86H1.148v-6.863h4.567zm0-8.002h-2.28V3.428h2.28zm1.148-12.57h3.427v1.14H8.003v11.43h-1.14zm3.427 2.287v10.282H9.15V4.575zm1.14 18.285H6.863v-6.863h4.567zm11.43 0H12.578v-8.003H11.43V1.14h9.143v3.435h-3.428v1.14h5.715z" />
          <path d="M19.433 15.997h1.14v1.148h-1.14zM19.433 13.717h1.14v1.14h-1.14zM17.145 17.145h2.287v1.14h-2.287zM16.005 15.997h1.14v1.148h-1.14zM16.005 13.717h1.14v1.14h-1.14zM16.005 5.715h1.14v2.287h-1.14zM14.857 8.002h1.148v2.288h-1.147zM13.717 10.29h1.14v2.28h-1.14zM13.717 2.287h1.14v1.14h-1.14zM12.578 12.57h1.14v2.287h-1.14zM8.002 18.285h2.288v2.287H8.003zM2.287 18.285h2.288v2.287H2.287z" />
        </svg>
      </div>
      <button id="sosumi-copy-button" title="Copy Sosumi URL">
        <div class="sosumi-copy-inner">
          <span class="sosumi-copy-text">Copy</span>
        </div>
      </button>
    `;

        const copyBtn = container.querySelector('#sosumi-copy-button');
        copyBtn.addEventListener('click', async () => {
            if (!sosumiUrl) return;

            try {
                await navigator.clipboard.writeText(sosumiUrl);
                const textSpan = copyBtn.querySelector('.sosumi-copy-text');
                const originalText = textSpan.textContent;
                textSpan.textContent = 'Copied!';
                copyBtn.classList.add('success');
                setTimeout(() => {
                    textSpan.textContent = originalText;
                    copyBtn.classList.remove('success');
                }, 2000);
            } catch (err) {
                console.error('Failed to copy URL:', err);
            }
        });

        document.body.appendChild(container);

        // Use a small delay to ensure DOM is ready for measurement
        requestAnimationFrame(() => {
            updatePosition();
            container.style.opacity = '1';
        });
    };

    // Resolve availability for the current path, then show or hide the button accordingly.
    const refresh = async () => {
        const path = window.location.pathname;
        checkedPath = path;
        sosumiUrl = null;
        document.getElementById('sosumi-container')?.remove();

        const url = await resolveSosumiUrl();
        if (checkedPath !== path) return; // navigated away while checking
        sosumiUrl = url;
        if (sosumiUrl) {
            initialUpdateDone = false;
            injectButton();
        }
    };

    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    // Wait for the entire page to load (including layouts) before showing
    if (document.readyState === 'complete') {
        refresh();
    } else {
        window.addEventListener('load', refresh);
    }

    const observer = new MutationObserver(() => {
        if (checkedPath === null) return; // initial check not started yet
        if (window.location.pathname !== checkedPath) {
            refresh();
            return;
        }
        if (!sosumiUrl) return;
        if (!document.getElementById('sosumi-container')) {
            initialUpdateDone = false; // Reset for potential re-injection
            injectButton();
        } else {
            updatePosition();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
