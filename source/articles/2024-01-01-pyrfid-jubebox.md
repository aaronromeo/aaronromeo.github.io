---

title: Rocking Out with RFID: The Saga of Building the pyrfid-jukebox
date: 2024-01-01 00:00 UTC
category: Raspberry Pi
tags: IoT, Raspberry Pi
authors: Aaron Romeo
summary: Building out a music player using a Raspberry Pi and an RFID Reader
layout: post
published: false

---

It's been a while since my last blog post—turns out, having two young kids can redefine your concept of 'free time'! This brings me to my latest project, born from watching my three-year-old's song preferences and dance rituals. Unlike my six-year-old, who struggles with an old iPod's complex interface in spite of being able to manage some basic reading. I wanted something simpler, more intuitive.

Enter the `pyrfid-jukebox` project, a child-friendly music player that’s as fun as it is functional. The core requirements were clear from the get-go:

- **Child's Play**: It should be effortlessly usable by a three-year-old.
- **Rough and Tumble Ready**: Designed to survive the sometimes-enthusiastic/sometimes-frustrated handling typical of its young users.
- **Intuitively Interactive**: A user-friendly interface with quick, positive feedback, keeping frustrations at bay.
- **Always On, Always Ready**: No reliance on the whims of home Wi-Fi for music playback.
- **Safe Sounds**: A volume control to safeguard those little ears.
- **Parent-Friendly Maintenance**: Easy for me to troubleshoot, but not so much for curious little fingers.

This is a post about my journey creating such a tool.




Exploring the pyrfid-jukebox Project: A Technical Deep Dive

Introduction

    Hook the readers with a quirky statement about the unlikely combination of RFID technology, music, and Raspberry Pi.
    Introduce the pyrfid-jukebox project, highlighting its unique aspects as revealed in our discussions and commit logs.

Inspiration and Inception

    Share the story behind the project's inception, drawing on details from our conversations.
    Discuss the initial vision and objectives as outlined in the README and commit logs.

Diving Into the Tech Stack

    Detailed discussion on the hardware components (RFID reader, Raspberry Pi) and their specific roles, referencing relevant commits.
    Overview of the software architecture, including the use of BlueALSA, CMUS, Python, and how these were integrated, with examples from commit logs.

Development Journey: Highlights and Hurdles

    Walk through key developmental milestones, using specific commit logs as references.
    Discuss major challenges faced, such as GPIO pin issues and button debouncing, and how they were humorously (yet effectively) resolved.

Feature Focus: More Than Meets the Eye

    Delve into the unique features of the project like hardware control integration, LED feedback, and voice interaction via espeak.
    Share insights into how these features evolved over time, with anecdotes from commit messages and project updates.

Optimization Odyssey

    Discuss the journey of refining the project, with examples from the commit logs on improving system stability (e.g., Watchdog Timer setup) and user interaction.
    Include the process of moving from PulseAudio to BlueALSA for better user experience, as detailed in the commit logs.

Future Directions and Community Involvement

    Share potential future enhancements and invite readers to contribute, tying in the open-source nature of the project.
    Reflect on the project's impact and learning experiences, encouraging readers to engage with the project's GitHub repository.

Conclusion: A Symphony of Code and Music

    Recap the project's journey, highlighting its blend of creativity, technical challenges, and community engagement.
    Conclude with a call-to-action for readers to explore, contribute, or start their own Raspberry Pi-based projects.

Additional Resources

    Provide links to the GitHub repository, specific commit logs, and any other resources for readers to delve deeper into the project.
