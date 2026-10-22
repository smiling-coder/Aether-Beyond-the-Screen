# AETHER — Beyond the Screen

A cinematic, scroll-driven 3D website for a fictional AI energy orb called **AETHER**. Scroll forward and the orb awakens, opens into floating components, becomes a glowing neural network, travels through a digital universe, and reforms in a final reveal. Scroll back and the story plays in reverse.

**Live demo:** https://smiling-coder.github.io/aether-beyond-the-screen/

## Features

- Real-time 3D orb built with Three.js: transparent shell, glowing core, rotating rings, floating particles
- Scroll-linked camera movement and transformations (fully reversible)
- Cursor-responsive movement on desktop, touch scrolling on mobile
- Minimal progress indicator
- Responsive layout for mobile, tablet and desktop
- Optimised particle counts and pixel ratio for mid-range phones
- Respects `prefers-reduced-motion`
- Lightweight CSS fallback when WebGL is unavailable
- 100% original visual identity: no copied assets, text or layouts

## The story

1. **Hero:** "The future is not a screen."
2. **Awaken:** the camera approaches, the rings speed up, the core brightens
3. **Transformation:** the orb opens into floating geometric components
4. **The digital mind:** the components become a neural network
5. **Beyond reality:** the camera flies through the network into a digital universe
6. **The final reveal:** the orb reforms and the camera pulls back

## Tech stack

HTML5 · CSS3 · JavaScript · [Three.js](https://threejs.org/) (r128) · [GSAP](https://gsap.com/) + ScrollTrigger (3.12.5)

All libraries load from the cdnjs CDN, so there is nothing to install.

## Project structure

```
aether-beyond-the-screen/
├── index.html   # page structure and scroll text
├── style.css    # typography, layout, fallback, responsive rules
├── script.js    # Three.js scene, scroll timeline, interaction
└── README.md
```

## Run locally

1. Download or clone the repository
2. Open the folder in VS Code
3. Right-click `index.html` and choose **Open with Live Server** (install the Live Server extension if needed)

An internet connection is required for the CDN libraries and fonts.

## Deploy with GitHub Pages

1. Push `index.html`, `style.css`, `script.js` and `README.md` to the root of your repository
2. Go to **Settings → Pages**
3. Under **Source**, choose the `main` branch and the `/ (root)` folder, then save
4. Your site will be live in a minute or two

## Customise

- **Colours:** change the `CYAN` and `VIOLET` values at the top of the scene section in `script.js`, and the CSS variables in `style.css`
- **Text:** edit the headings in `index.html`
- **Timing:** each text block uses `data-in` and `data-out` (scroll progress from 0 to 1)
- **Button link:** change the `href` of the **EXPLORE AETHER** button in `index.html` and remove its click handler in `script.js`

## Browser support

Latest Chrome, Edge, Firefox and Safari, on desktop and mobile. Browsers without WebGL see the fallback.

## License

MIT. Free to use and modify.
