# Weird Fishes

> There is no goal in this game, just chill out and enjoy.  
> Please wear headphones for the best experience.

![Weird Fishes screenshot](docs/TxdNbW.png)

A relaxing WebGL aquarium made for **Quarantine Jam 2020**. Thousands of little fish swim around in GPU-driven schools: lure them, scare them, or just watch.

**Play online:** [evercloud.itch.io/weird-fishes](https://evercloud.itch.io/weird-fishes)

## Controls

| Input                          | Action        |
| ------------------------------ | ------------- |
| Drag one finger / left click   | Lure fishes   |
| Drag two fingers / right click | Frighten them |

## Run locally

No build step — just a static server (ES modules need HTTP, not `file://`):

```bash
npm install
npm start
```

Opens at [http://localhost:3000](http://localhost:3000).

## Credits

- **Design & coding** — Claudio Scamporlino
- **Music** — Emanuele Toscano

## Stats for nerds

- **4096** fishes
- Each fish is **3 triangles**, **9 vertices**
- Position and velocity simulations run on the **GPU**, not the CPU — decent performance on mobile too
- The soundtrack was composed in just a couple of hours
