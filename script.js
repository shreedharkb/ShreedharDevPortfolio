import portfolioData from "./data.js";
import { skillIcons } from "./icons.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const qs = (selector, parent = document) => parent.querySelector(selector);
const qsa = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text !== undefined) {
        node.textContent = text;
    }
    return node;
}

function link(label, href, className = "text-link") {
    const anchor = el("a", className, label);
    anchor.href = href;
    const shouldOpenInNewTab = !href.startsWith("#") && !href.startsWith("mailto:");
    anchor.target = shouldOpenInNewTab ? "_blank" : "_self";
    if (shouldOpenInNewTab) {
        anchor.rel = "noopener noreferrer";
    }
    return anchor;
}

function logoImage(logo) {
    const image = el("img", "org-logo");
    image.src = logo.src;
    image.alt = logo.alt;
    // Intrinsic size alongside a CSS height keeps the card from reflowing while
    // the mark loads.
    image.width = logo.width;
    image.height = logo.height;
    return image;
}

function typeInto(el, text, speed = 55) {
    // The full name stays in aria-label so assistive tech reads it whole rather
    // than catching whatever fragment exists when it looks.
    el.setAttribute("aria-label", text);
    el.classList.add("typing");

    let shown = 0;
    const step = () => {
        el.textContent = text.slice(0, ++shown);
        if (shown < text.length) {
            setTimeout(step, speed);
        } else {
            el.classList.remove("typing");
        }
    };

    setTimeout(step, 320);
}

function renderHero() {
    const { basic } = portfolioData;
    document.title = `${basic.name} | ${basic.role}`;

    const title = qs("#hero-title");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        title.textContent = basic.name;
        title.setAttribute("aria-label", basic.name);
    } else {
        typeInto(title, basic.name);
    }

    qs("#hero-role").textContent = basic.role;
    qs("#hero-intro").textContent = basic.intro;
    qs("#hero-location").textContent = basic.location;
    qs("#hero-photo").src = basic.profileImage;
    qs("#hero-photo").alt = `${basic.name} portrait`;

    const resume = qs("#nav-resume");
    if (basic.resumeLink) {
        resume.href = basic.resumeLink;
        resume.hidden = false;
    } else {
        resume.hidden = true;
    }
}

// A section whose source array is empty would render as a heading over an empty
// box, and its nav link would scroll to nothing. Contact is excluded because it
// renders from objects, not arrays.
function hideEmptySections() {
    const sources = {
        experience: portfolioData.experience,
        projects: portfolioData.projects,
        hackathons: portfolioData.achievements,
        skills: portfolioData.skills,
        education: portfolioData.education,
        leadership: portfolioData.leadership
    };

    Object.entries(sources).forEach(([id, items]) => {
        if (items.length) return;
        qs(`#${id}`).hidden = true;
        document.querySelector(`.site-nav a[href="#${id}"]`)?.remove();
    });

    if (!portfolioData.archivedProjects.length) {
        qs("#archive-toggle").hidden = true;
    }
}

function renderExperience() {
    const list = qs("#experience-list");

    portfolioData.experience.forEach((item) => {
        const card = el("article", "timeline-card");
        const header = el("div", "card-header");
        const titleWrap = el("div");

        titleWrap.append(el("p", "meta", item.period), el("h3", "", `${item.company} - ${item.title}`));
        header.append(titleWrap);

        card.append(header, el("p", "summary", item.summary), pointList(item.points), tagList(item.tags));
        list.append(card);
    });
}

function renderProjects() {
    const grid = qs("#project-grid");

    portfolioData.projects.forEach((project) => {
        grid.append(projectCard(project));
    });

    renderArchivedProjects();
}

function projectCard(project) {
    const card = el("article", "project-card");

    if (project.image) {
        const preview = el("button", "project-preview");
        preview.type = "button";
        preview.setAttribute("aria-label", `Open ${project.name} screenshot`);

        const image = document.createElement("img");
        image.src = project.image;
        image.alt = `${project.name} screenshot`;
        image.loading = "lazy";

        preview.append(image);
        preview.addEventListener("click", () => openImageDialog(project.image, `${project.name} screenshot`));
        card.append(preview);
    }

    const actions = el("div", "inline-links");
    if (project.link) {
        actions.append(link("Live", project.link));
    }
    if (project.github) {
        actions.append(link("Code", project.github));
    }

    const header = el("div", "project-card-header");
    const titleWrap = el("div");
    titleWrap.append(el("p", "meta", project.type), el("h3", "", project.name));
    header.append(titleWrap);
    if (actions.children.length) {
        header.append(actions);
    }

    card.append(
        header,
        el("p", "summary", project.summary),
        pointList(project.points),
        tagList(project.stack)
    );

    return card;
}

function renderArchivedProjects() {
    const archiveGrid = qs("#archive-grid");
    const archiveToggle = qs("#archive-toggle");

    portfolioData.archivedProjects.forEach((project) => {
        archiveGrid.append(projectCard(project));
    });

    archiveToggle.addEventListener("click", () => {
        const isExpanded = archiveToggle.getAttribute("aria-expanded") === "true";
        archiveToggle.setAttribute("aria-expanded", String(!isExpanded));
        archiveGrid.hidden = isExpanded;
        archiveToggle.textContent = isExpanded ? "show archived builds" : "hide archived builds";
    });
}

function renderAchievements() {
    const grid = qs("#achievement-grid");

    portfolioData.achievements.forEach((achievement) => {
        const card = el("article", "achievement-card");

        if (achievement.image) {
            const preview = el("button", "achievement-preview");
            preview.type = "button";
            preview.setAttribute("aria-label", `Open ${achievement.title} photo`);

            const image = document.createElement("img");
            image.src = achievement.image;
            image.alt = `${achievement.title} prize photo`;
            image.loading = "lazy";

            preview.append(image);
            preview.addEventListener("click", () => openImageDialog(achievement.image, `${achievement.title} prize photo`));
            card.append(preview);
        }

        card.append(el("h3", "", achievement.title), el("p", "summary", achievement.detail));
        if (achievement.link) {
            card.append(link("Certificate", achievement.link));
        }
        grid.append(card);
    });
}

function renderSkills() {
    const board = qs("#skill-board");
    portfolioData.skills.forEach((skillGroup) => {
        const card = el("article", "skill-card");
        card.append(el("h3", "", skillGroup.group), tagList(skillGroup.items));
        board.append(card);
    });
}

function renderEducation() {
    const educationList = qs("#education-list");
    portfolioData.education.forEach((education) => {
        const card = el("article", "education-box");
        const body = el("div", "card-body");
        body.append(
            el("h3", "", education.institution),
            el("p", "summary", `${education.degree} / ${education.period}`),
            el("p", "meta", education.result)
        );
        card.append(logoImage(education.logo), body);
        educationList.append(card);
    });
}

function renderLeadership() {
    const leadershipList = qs("#leadership-list");
    portfolioData.leadership.forEach((entry) => {
        const card = el("article", "leadership-card");
        const body = el("div", "card-body");
        body.append(
            el("h3", "", `${entry.organization} - ${entry.role}`),
            el("p", "summary", entry.summary)
        );
        card.append(logoImage(entry.logo), body);
        leadershipList.append(card);
    });
}

function renderContact() {
    qs("#contact-pitch").textContent = portfolioData.contact.pitch;
    qs("#footer-copy").textContent = `${new Date().getFullYear()} ${portfolioData.basic.name}.`;

    const socials = qs("#social-links");
    socials.append(link(portfolioData.basic.email, `mailto:${portfolioData.basic.email}`, "social-link primary"));
    portfolioData.social.forEach((social) => socials.append(link(social.label, social.href, "social-link")));
}

function initializeDialog() {
    const dialog = qs("#image-dialog");
    // A modal dialog paints in the top layer, above the custom pointer, so the
    // native cursor has to take over while one is open.
    dialog.addEventListener("toggle", () => {
        document.documentElement.dataset.dialogOpen = String(dialog.open);
    });
    qs("#dialog-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
            dialog.close();
        }
    });
}

function openImageDialog(src, caption) {
    const dialog = qs("#image-dialog");
    qs("#dialog-image").src = src;
    qs("#dialog-image").alt = caption;
    qs("#dialog-caption").textContent = caption;

    if (typeof dialog.showModal === "function") {
        dialog.showModal();
    } else {
        dialog.setAttribute("open", "");
    }
}

function pointList(points) {
    const list = el("ul", "point-list");
    points.forEach((point) => list.append(el("li", "", point)));
    return list;
}

function svgIcon(icon) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    if (icon.stroke) {
        svg.setAttribute("fill", "none");
        svg.setAttribute("stroke", "currentColor");
        svg.setAttribute("stroke-width", "1.7");
        svg.setAttribute("stroke-linecap", "round");
        svg.setAttribute("stroke-linejoin", "round");
    } else {
        svg.setAttribute("fill", "currentColor");
    }
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", icon.d);
    svg.append(path);
    return svg;
}

function tagList(tags) {
    const wrap = el("div", "tag-list");
    tags.forEach((tag) => {
        const icon = skillIcons[tag.toLowerCase()];
        const badge = el("span", "skill-badge");
        if (icon) {
            badge.append(svgIcon(icon));
        }
        badge.append(el("span", "", tag));
        badge.style.setProperty("--brand-color", icon ? icon.color : "var(--green)");
        wrap.append(badge);
    });
    return wrap;
}

function initializeNavigationState() {
    const links = qsa(".site-nav a");
    const sections = links.map((item) => qs(item.getAttribute("href"))).filter(Boolean);

    const observer = new IntersectionObserver((entries) => {
        const active = entries.find((entry) => entry.isIntersecting);
        if (!active) {
            return;
        }
        links.forEach((item) => item.classList.toggle("active", item.getAttribute("href") === `#${active.target.id}`));
    }, { rootMargin: "-20% 0px -65% 0px", threshold: 0.1 });

    sections.forEach((section) => observer.observe(section));
}

const CURSOR_LOCKS = "a, button, input, select, textarea, summary, .skill-badge";

function initializeCursor() {
    const ringWrap = qs(".cursor-ring-wrap");
    const dotWrap = qs(".cursor-dot-wrap");
    if (!ringWrap || !dotWrap || !matchMedia("(pointer: fine)").matches) {
        return;
    }

    const ring = qs(".cursor-ring", ringWrap);
    const dot = qs(".cursor-dot", dotWrap);

    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;
    let frame = null;

    // The ring trails the pointer; catching up instantly would just be a second cursor.
    const trail = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0.2;

    const step = () => {
        ringX += (targetX - ringX) * trail;
        ringY += (targetY - ringY) * trail;
        ringWrap.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
        const stillTrailing = Math.abs(targetX - ringX) > 0.2 || Math.abs(targetY - ringY) > 0.2;
        frame = stillTrailing ? requestAnimationFrame(step) : null;
    };

    document.addEventListener("pointermove", (event) => {
        targetX = event.clientX;
        targetY = event.clientY;
        dotWrap.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
        if (frame === null) {
            frame = requestAnimationFrame(step);
        }
        const isLocked = Boolean(event.target.closest && event.target.closest(CURSOR_LOCKS));
        ring.classList.toggle("locked", isLocked);
        dot.classList.toggle("locked", isLocked);
    });

    const setFiring = (on) => {
        ring.classList.toggle("firing", on);
        dot.classList.toggle("firing", on);
    };
    document.addEventListener("pointerdown", () => setFiring(true));
    document.addEventListener("pointerup", () => setFiring(false));
    document.addEventListener("pointercancel", () => setFiring(false));

    const setOpacity = (value) => {
        ringWrap.style.opacity = value;
        dotWrap.style.opacity = value;
    };
    document.documentElement.addEventListener("mouseleave", () => setOpacity("0"));
    document.documentElement.addEventListener("mouseenter", () => setOpacity("1"));
}

function initialize() {
    renderHero();
    renderExperience();
    renderProjects();
    renderAchievements();
    renderSkills();
    renderEducation();
    renderLeadership();
    renderContact();
    hideEmptySections();
    initializeDialog();
    initializeNavigationState();
    initializeCursor();
}

document.addEventListener("DOMContentLoaded", initialize);
