# Bad Apple in Three.js: project documentation

A full 3D recreation of the silhouette music video's staging, choreography, camera work and transitions,
rebuilt from scratch in Three.js. It uses no video frames and no 2D tracing. Milestone 1 covered
**0:00 – 0:24**; milestone 2 extends it to **0:35**, milestone 3 to **0:41**, milestone 4 to **0:47**, milestone 5 to **0:56.5**, and milestone 6 to **1:10**.

| Doc | Contents |
| --- | --- |
| [01-overview.md](01-overview.md) | Goals, deliverables, how to run and render, current milestone |
| [02-storyboard.md](02-storyboard.md) | Beat-by-beat analysis of the original and how each beat is staged in 3D |
| [03-architecture.md](03-architecture.md) | Engine: deterministic timeline, accumulation renderer, behind-the-scenes view, headless pipeline |
| [04-characters.md](04-characters.md) | Reimu, Marisa, Patchouli, Remilia, Sakuya, Flandre, Youmu and Yuyuko, modeled from the original's silhouettes; the procedural rig, hair and cloth chains, props |
| [05-transitions.md](05-transitions.md) | How every transition is staged, including the color inversion on the catch, the palette wipe, the core turning into a girl her hand turning into Remilia’s hand, the cup fragment becoming Sakuya, her knife becoming Flandre’s crystal wing, and the sword/tree/fan sequence |
| [06-agent-process.md](06-agent-process.md) | How the project was run as an AI agent: the review loop, metrics, bugs found, lessons |
| [07-status.md](07-status.md) | Measured fidelity, known issues, next steps |
| [08-handoff.md](08-handoff.md) | **Start here if you're taking over:** setup, the working loop, traps in the code, lessons learned |
| [09-animating-motion.md](09-animating-motion.md) | **Read before animating a character:** why keyed poses move like a robot, how to diagnose it, and the motion-curve method that fixed Patchouli |
