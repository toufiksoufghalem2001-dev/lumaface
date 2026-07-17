# Binary assets (hosted externally)

The three PNG assets are not tracked in this repository (delivery-channel limitation). Download them into `public/` before `npm run build`:

```bash
curl -L -o public/hero-still-life.png "https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2Fb0fcf3de1f46484d4e15c6051ec873e3486c2661759ecda125a67fdda64b74b3?filename=hero-still-life.png&sig=KmLimNbMv3_mk9rtAcSKIW46CHK0k1f9bwR99YgWNCM=&t=o"
curl -L -o public/texture-linen.png "https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2F599643ed0e57b72dd0b457ffe85d1dbf1e92be23309937f728235ea8e8125572?filename=texture-linen.png&sig=SPaMI5vCNHbeItgwxe6ksd9zhGQ8agfTXonIePY2Kas=&t=o"
curl -L -o public/icon-512.png "https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2F99973e926fd8482cd334fb8d1731d5a2c816de71ccd1240a5b8bfab3c2d780c9?filename=icon-512.png&sig=f3uhtUqUiKQJi1vxNoj7iZGss2oD3rmk_TXEs3n-wjU=&t=o"
```

- `hero-still-life.png` — warm editorial still-life (onboarding + paywall hero, 2:3)
- `texture-linen.png` — subtle linen backdrop texture (desktop frame)
- `icon-512.png` — LumaFace petal app icon (PWA manifest, apple-touch-icon)

These URLs are signed; if they expire, regenerate the assets with the prompts in the design docs (`design.md` asset manifest) or ask the team for the originals.
