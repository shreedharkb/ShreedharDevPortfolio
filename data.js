const portfolioData = {
    basic: {
        name: "YOUR NAME",
        role: "Full-stack | AI/ML",
        location: "Dharwad, India",
        email: "you@example.com",
        resumeLink: "",
        profileImage: "images/profile_photo/hero-portrait.png",
        intro: "One or two sentences about what you build."
    },
    experience: [
        {
            title: "Role Title",
            company: "Company",
            period: "Mon YYYY - Mon YYYY",
            location: "City",
            tags: ["Tech", "Tech"],
            summary: "One line on what the work was.",
            points: [
                "Achievement bullet with a number in it.",
                "Another bullet."
            ]
        }
    ],
    projects: [
        {
            name: "ProjectName",
            type: "What it is in four words",
            link: "https://live-url",
            github: "https://github.com/you/repo",
            image: "images/projects/projectname.png",
            stack: ["React", "Node.js"],
            summary: "One line.",
            points: [
                "Bullet with a measurable outcome.",
                "Bullet on a hard technical decision."
            ]
        }
    ],
    archivedProjects: [],
    achievements: [],
    skills: [
        { group: "Languages", items: [] },
        { group: "Frontend", items: [] },
        { group: "Backend", items: [] },
        { group: "Databases", items: [] },
        { group: "Tools + Cloud", items: [] },
        { group: "Core CS", items: [] }
    ],
    education: [
        {
            institution: "IIIT Dharwad",
            degree: "Bachelor of Technology, Computer Science and Engineering",
            period: "2023 - 2027",
            result: "CGPA here"
        }
    ],
    leadership: [],
    social: [
        { label: "GitHub", href: "https://github.com/YOUR_USERNAME" },
        { label: "LinkedIn", href: "https://www.linkedin.com/in/YOUR_HANDLE/" }
    ],
    contact: {
        pitch: "Open to roles and opportunities."
    }
};

export default portfolioData;
