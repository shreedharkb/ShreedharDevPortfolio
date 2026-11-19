const portfolioData = {
    basic: {
        name: "Shreedhar K B",
        role: "B.Tech CSE Student | Full-stack | AI",
        location: "Dharwad, India",
        email: "shreedharkb4@gmail.com",
        resumeLink: "",
        profileImage: "images/profile_photo/me.jpeg",
        intro: "CS undergrad at IIIT Dharwad. I ship full-stack apps and AI engines, and obsess over clean interfaces."
    },
    experience: [],
    projects: [
        {
            name: "LexFind",
            type: "AI-powered legal research platform",
            link: "https://lex-find.vercel.app/",
            github: "https://github.com/shreedharkb/LexFind",
            image: "images/projects/lexfind.png",
            stack: ["Python", "FastAPI", "React", "PostgreSQL", "Qdrant", "LangGraph", "LangChain", "Groq LLM", "Docker", "Azure"],
            summary: "An AI-native legal research platform with agentic workflows and interactive conversational search.",
            points: [
                "Achieved 82.3% retrieval accuracy on a 46k-document corpus using Qdrant Hybrid RRF and LangChain.",
                "Built agentic search workflows that answer legal questions conversationally."
            ]
        },
        {
            name: "Speechify",
            type: "AI-powered semantic quiz platform",
            link: "https://speechify-psi.vercel.app/",
            github: "https://github.com/shreedharkb/Speechify",
            image: "images/projects/speechify.png",
            stack: ["React", "Node.js", "PostgreSQL", "Prisma", "Redis", "PyTorch", "Jenkins", "Docker"],
            summary: "An interactive AI grading engine for semantic evaluation of open-ended answers.",
            points: [
                "Reached over 90% grading accuracy with a PyTorch model.",
                "Served answers through RESTful Node.js microservices with Redis queuing.",
                "Automated delivery with a Jenkins CI/CD pipeline."
            ]
        },
        {
            name: "FinOS",
            type: "AI-powered personal finance OS",
            link: "https://fin-os-self.vercel.app/",
            github: "https://github.com/shreedharkb/FinOS",
            image: "images/projects/finos.png",
            stack: ["Next.js", "React", "PostgreSQL", "Prisma", "Google Gemini", "Inngest", "Tailwind CSS", "Clerk"],
            summary: "A financial dashboard that turns receipt photos into structured data.",
            points: [
                "Used Google Gemini Vision to parse unstructured receipts into structured entries.",
                "Wired ingestion into event-driven serverless workflows with Inngest."
            ]
        },
        {
            name: "AtlasAI",
            type: "AI-powered travel agent",
            link: "https://atlas-ai-teal.vercel.app/",
            github: "https://github.com/shreedharkb/AtlasAI",
            image: "images/projects/atlasai.png",
            stack: ["Next.js", "React", "Groq", "Tailwind CSS", "dnd-kit", "Framer Motion"],
            summary: "A trip planner that converts open-ended prompts into interactive itineraries.",
            points: [
                "Streamed generated itineraries server-side to keep first paint fast.",
                "Added auto-repairing JSON parsers so malformed model output still renders.",
                "Built a drag-and-drop itinerary editor with dnd-kit."
            ]
        }
    ],
    archivedProjects: [],
    achievements: [],
    skills: [
        { group: "Languages", items: ["Python", "JavaScript", "C++"] },
        { group: "Frontend", items: ["React", "Next.js"] },
        { group: "Backend", items: ["Node.js", "FastAPI"] },
        { group: "Databases", items: ["PostgreSQL"] },
        { group: "AI", items: ["LangChain"] },
        { group: "Tools + Cloud", items: ["Docker"] }
    ],
    education: [
        {
            institution: "Indian Institute of Information Technology Dharwad",
            degree: "B.Tech in Computer Science and Engineering",
            period: "Sept 2023 - May 2027",
            result: ""
        }
    ],
    leadership: [
        {
            organization: "IEEE Student Branch, IIIT Dharwad",
            role: "Chair",
            summary: "Led the campus IEEE student community as Chair, Aug 2025 - Apr 2026."
        },
        {
            organization: "IEEE Computer Society, IIIT Dharwad",
            role: "Chair",
            summary: "Chaired the Computer Society chapter, Jan 2025 - Apr 2026."
        }
    ],
    social: [
        { label: "GitHub", href: "https://github.com/shreedharkb" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/shreedharkb" }
    ],
    contact: {
        pitch: "Open to internships and full-time roles in full-stack engineering and applied AI."
    }
};

export default portfolioData;
