const portfolioData = {
    basic: {
        name: "Shreedhar K B",
        role: "B.Tech CSE Student | Full-stack | AI",
        location: "Dharwad, India",
        email: "shreedharkb4@gmail.com",
        resumeLink: "resume/Shreedhar_KB_Resume.pdf",
        profileImage: "images/profile_photo/me.jpeg",
        intro: "CS undergrad at IIIT Dharwad. I build agentic AI systems and the full-stack products that put them in front of users."
    },
    experience: [],
    projects: [
        {
            name: "LexFind",
            type: "Agentic AI legal research platform",
            link: "https://lex-find.vercel.app/",
            github: "https://github.com/shreedharkb/LexFind",
            image: "images/projects/lexfind.png",
            stack: ["FastAPI", "React", "Qdrant", "RAG", "LangGraph", "Celery", "RabbitMQ", "pgvector"],
            summary: "Retrieval-augmented legal research over a large corpus, driven by an agent that decides how each query should be answered.",
            points: [
                "Built a LangGraph agent that routes each query to corpus search, document Q&A, or general chat.",
                "Added a self-correcting retrieval loop where an LLM grader triggers query relaxation and retry.",
                "Implemented hybrid search fusing BM25 and dense vectors with RRF over section-aware chunks.",
                "Offloaded PDF ingestion to Celery and RabbitMQ workers, storing chunks in pgvector."
            ]
        },
        {
            name: "Speechify",
            type: "AI quiz grader",
            link: "https://speechify-psi.vercel.app/",
            github: "https://github.com/shreedharkb/Speechify",
            image: "images/projects/speechify.png",
            stack: ["React", "Node.js", "Sentence-BERT", "Redis", "Whisper", "Jenkins", "Docker"],
            summary: "A quiz platform that grades free-text and spoken answers semantically rather than by exact match.",
            points: [
                "Developed a quiz platform with text and voice answers transcribed by a Whisper microservice.",
                "Designed a layered NLP grader using lexical gating, Sentence-BERT, and negation penalties.",
                "Decoupled grading with Bull and Redis queues and retries, then pushed live results to students.",
                "Configured Jenkins CI/CD running SonarQube, OWASP, and Trivy scans before Docker builds."
            ]
        },
        {
            name: "FinOS",
            type: "AI finance manager",
            link: "https://fin-os-self.vercel.app/",
            github: "https://github.com/shreedharkb/FinOS",
            image: "images/projects/finos.png",
            stack: ["Next.js", "PostgreSQL", "Google Gemini", "Inngest", "Prisma", "Clerk", "Arcjet"],
            summary: "A personal finance dashboard that turns receipt photos into categorised, budgeted transactions.",
            points: [
                "Integrated Gemini Vision to extract amount, date, and category from receipts into the form.",
                "Automated budget alerts, recurring transactions, and monthly AI reports with Inngest workflows.",
                "Secured mutations with Clerk auth and Arcjet rate limiting, using atomic Prisma transactions."
            ]
        }
    ],
    archivedProjects: [],
    achievements: [],
    skills: [
        { group: "Languages", items: ["C++", "JavaScript", "Python"] },
        { group: "Web + Backend", items: ["React", "Next.js", "Node.js", "Express", "FastAPI", "REST APIs"] },
        { group: "Databases + Tools", items: ["PostgreSQL", "MongoDB", "Qdrant", "Redis", "Git"] },
        { group: "Cloud + DevOps", items: ["Docker", "Jenkins", "Linux", "Azure"] },
        { group: "AI + ML", items: ["RAG", "LangGraph"] },
        { group: "Core CS", items: ["Data Structures & Algorithms", "Object-Oriented Programming", "Operating Systems", "Computer Networks", "Database Management Systems"] }
    ],
    education: [
        {
            institution: "Indian Institute of Information Technology Dharwad",
            degree: "B.Tech in Computer Science and Engineering",
            period: "2023 - 2027",
            result: "CGPA: 7.64 / 10"
        }
    ],
    leadership: [
        {
            organization: "IEEE Student Branch, IIIT Dharwad",
            role: "Chair",
            summary: "Led the branch in organising technical events across the campus community."
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
