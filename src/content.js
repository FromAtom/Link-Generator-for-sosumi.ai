(() => {
    let initialUpdateDone = false;

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
            const currentUrl = window.location.href;
            const sosumiUrl = currentUrl.replace('developer.apple.com', 'sosumi.ai');

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

    window.addEventListener('scroll', updatePosition, { passive: true });
    window.addEventListener('resize', updatePosition);

    // Wait for the entire page to load (including layouts) before showing
    if (document.readyState === 'complete') {
        injectButton();
    } else {
        window.addEventListener('load', injectButton);
    }

    const observer = new MutationObserver(() => {
        if (!document.getElementById('sosumi-container')) {
            initialUpdateDone = false; // Reset for potential re-injection
            injectButton();
        } else {
            updatePosition();
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
