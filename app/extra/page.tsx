"use client";

import {
  ArrowDown,
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Code2,
  GraduationCap,
  Heart,
  Home as HomeIcon,
  Mail,
  MapPin,
  Menu,
  Phone,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./biodata.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  variable: "--font-devanagari",
  display: "swap",
});

const aboutDetails = [
  ["Name", "Vishal Raut", User],
  ["Education", "B.Sc. Mathematics", GraduationCap],
  ["Profession", "Teacher", Briefcase],
  ["Location", "Takrwan, Beed, Maharashtra", MapPin],
];

const skills = [
  "JavaScript",
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "HTML & CSS",
  "SQL",
  "Git & GitHub",
];

const biodataPersonal = [
  ["नाव", "चि. विशाल परमेश्वर राऊत", User],
  ["जन्म तारीख", "25/05/1999", Calendar],
  ["जन्म वेळ", "1:15", Clock],
  ["जन्म ठिकाण", "तालखेड", MapPin],
  ["राहण्याचे ठिकाण", "टाकरवन", HomeIcon],
  ["धर्म / जात", "हिंदू / माळी", Heart],
  ["वर्ण", "गव्हाळ", User],
  ["उंची", "5 फूट / 5 इंच (170 सेमी)", User],
  ["रक्तगट", "बी पॉझिटिव्ह", Heart],
];

const biodataTraditional = [
  ["कुलदैवत", "तुळजाभवानी", Sparkles],
  ["गोत्र", "अगस्त्य", Sparkles],
  ["नक्षत्र", "हस्त", Sparkles],
  ["राशी", "कुंभ", Sparkles],
  ["नाडी", "आध", Sparkles],
  ["गण", "देव", Sparkles],
];

const biodataFamily = [
  ["शिक्षण", "BSc Math (fullstack Devloper)", GraduationCap],
  ["नोकरी", "शिक्षक", Briefcase],
  ["उत्पन्न", "₹17,000", Briefcase],
  ["वडिलांचे नाव", "परमेश्वर नारायण राऊत", User],
  ["वडिलांचा व्यवसाय", "शेती", Briefcase],
  ["आईचे नाव", "सौ. सुनीता परमेश्वर राऊत", User],
  ["भाऊ", "चि. ज्ञानेश्वर परमेश्वर राऊत (MSF)", User],
  ["बहीण", "सौ. रुपाली भागवत चौधरी (English School Teacher)", User],
];

const relatives =
  "गोरे, इंगळे, चौधरी, कदम, गोबरे, लेंडाळ, कोरडे, भूंबे, घोलप, शिंदे, वादे, बाबडे.";

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function MagneticButton({
  children,
  href,
  secondary = false,
}: {
  children: React.ReactNode;
  href: string;
  secondary?: boolean;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  return (
    <motion.a
      href={href}
      className={`button ${secondary ? "secondary" : ""}`}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set((event.clientX - rect.left - rect.width / 2) * 0.1);
        y.set((event.clientY - rect.top - rect.height / 2) * 0.1);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </motion.a>
  );
}

function ProfileImage() {
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 180, damping: 20 });
  const springY = useSpring(rotateY, { stiffness: 180, damping: 20 });

  return (
    <motion.div
      className="profile-image-wrap"
      style={{ rotateX: springX, rotateY: springY }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        rotateY.set(x * 9);
        rotateX.set(y * -9);
      }}
      onPointerLeave={() => {
        rotateX.set(0);
        rotateY.set(0);
      }}
    >
      <div className="profile-image">
        <Image
          src="/profile.png"
          alt="Vishal Raut"
          fill
          priority
          sizes="(max-width: 700px) 160px, 250px"
        />
      </div>

      <motion.div
        className="availability"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <span />
        Available
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <main className={`biodata ${inter.variable} ${devanagari.variable}`}>
      <header className="header">
        <div className="header-inner">
          <button className="logo" onClick={() => scrollTo("home")}>
            VR<span>.</span>
          </button>

          <nav className="desktop-nav">
            <button onClick={() => scrollTo("about")}>About</button>
            <button onClick={() => scrollTo("education")}>Education</button>
            <button onClick={() => scrollTo("skills")}>Skills</button>
            <button onClick={() => scrollTo("biodata")}>Biodata</button>
            <button onClick={() => scrollTo("contact")}>Contact</button>
          </nav>

          <button
            className="menu-button"
            aria-label="Toggle menu"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <motion.div
          className="mobile-nav"
          initial={false}
          animate={{
            height: menuOpen ? "auto" : 0,
            opacity: menuOpen ? 1 : 0,
          }}
        >
          <button onClick={() => scrollTo("about")}>About</button>
          <button onClick={() => scrollTo("education")}>Education</button>
          <button onClick={() => scrollTo("skills")}>Skills</button>
          <button onClick={() => scrollTo("biodata")}>Biodata</button>
          <button onClick={() => scrollTo("contact")}>Contact</button>
        </motion.div>
      </header>

      <section id="home" className="hero">
        <div className="hero-bg-circle circle-one" />
        <div className="hero-bg-circle circle-two" />

        <div className="hero-card">
          <motion.div
            className="hero-left"
            initial={{ opacity: 0, x: -45 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="eyebrow">PERSONAL PORTFOLIO</p>

            <h1>
              Vishal
              <br />
              <span>Raut.</span>
            </h1>

            <h2>B.Sc. Mathematics · Full-Stack Developer</h2>

            <p className="hero-description">
              I build modern, responsive and practical web applications with a
              strong interest in technology, problem solving and continuous
              learning.
            </p>

            <div className="hero-buttons">
              <MagneticButton href="#contact">
                Contact Me <ArrowRight size={16} />
              </MagneticButton>

              <MagneticButton href="#about" secondary>
                Explore <ArrowDown size={16} />
              </MagneticButton>
            </div>

            <div className="hero-meta">
              <span><MapPin size={15} /> Maharashtra, India</span>
              <span><Briefcase size={15} /> Teacher</span>
            </div>
          </motion.div>

          <motion.div
            className="hero-right"
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 }}
          >
            <ProfileImage />

            <motion.div
              className="floating-card floating-top"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Code2 size={17} />
              <span>Full-Stack</span>
            </motion.div>

            <motion.div
              className="floating-card floating-bottom"
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 4.5, repeat: Infinity }}
            >
              <GraduationCap size={17} />
              <span>B.Sc. Math</span>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          className="scroll"
          animate={{ y: [0, 7, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span>SCROLL</span>
          <ArrowDown size={15} />
        </motion.div>
      </section>

      <section id="about" className="section">
        <Reveal>
          <p className="section-label">01 — ABOUT</p>
          <h2>A little<br /><span>about me.</span></h2>
        </Reveal>

        <div className="about-layout">
          <Reveal className="about-text">
            <p>I enjoy learning modern technologies and turning ideas into useful software.</p>
            <p>
              My background in Mathematics helps me approach problems analytically,
              while my interest in development keeps me exploring modern web technologies.
            </p>
          </Reveal>

          <div className="about-grid">
            {aboutDetails.map(([label, value, Icon], index) => (
              <Reveal key={label} delay={index * 0.08}>
                <motion.div className="info-card" whileHover={{ y: -7 }}>
                  <div className="info-icon"><Icon size={19} /></div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="education" className="section">
        <Reveal>
          <p className="section-label">02 — EDUCATION</p>
          <h2>Learning is<br /><span>continuous.</span></h2>
        </Reveal>

        <div className="timeline">
          <Reveal>
            <motion.div className="timeline-item" whileHover={{ x: 7 }}>
              <div className="timeline-dot"><CheckCircle2 size={13} /></div>
              <div>
                <span>BACHELOR&apos;S DEGREE</span>
                <h3>B.Sc. Mathematics</h3>
                <p>Mathematics · Analytical Thinking · Problem Solving</p>
              </div>
            </motion.div>
          </Reveal>

          <Reveal delay={0.15}>
            <motion.div className="timeline-item" whileHover={{ x: 7 }}>
              <div className="timeline-dot"><Code2 size={13} /></div>
              <div>
                <span>DEVELOPMENT</span>
                <h3>Full-Stack Development</h3>
                <p>Building modern web applications and continuously learning new technologies.</p>
              </div>
            </motion.div>
          </Reveal>
        </div>
      </section>

      <section id="skills" className="section skills-section">
        <Reveal>
          <p className="section-label">03 — SKILLS</p>
          <h2>Tools I<br /><span>work with.</span></h2>
        </Reveal>

        <div className="skills">
          {skills.map((skill, index) => (
            <motion.div
              key={skill}
              className="skill"
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
              whileHover={{ y: -7, scale: 1.04 }}
            >
              <Sparkles size={15} />
              {skill}
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section profile-section">
        <Reveal>
          <p className="section-label">04 — PROFILE</p>
          <h2>Building with<br /><span>purpose.</span></h2>
        </Reveal>

        <Reveal delay={0.1}>
          <motion.div className="profile-box" whileHover={{ scale: 1.01 }}>
            <div className="profile-box-icon"><Code2 size={25} /></div>
            <p>
              I enjoy turning ideas into functional web applications. My focus is
              on clean interfaces, practical solutions, full-stack development
              and learning modern technologies.
            </p>
            <div className="profile-tags">
              <span>Clean UI</span>
              <span>Web Development</span>
              <span>Problem Solving</span>
              <span>Continuous Learning</span>
            </div>
          </motion.div>
        </Reveal>
      </section>

      <section id="biodata" className="section biodata-section">
        <Reveal>
          <p className="section-label">05 —  परिचय</p>
          <h2>माझा<br /><span> परिचय.</span></h2>
          <p className="biodata-intro">
            वैयक्तिक माहिती, पारंपरिक माहिती आणि कुटुंबाची थोडक्यात ओळख.
          </p>
        </Reveal>

        <div className="biodata-category">
          <Reveal>
            <div className="category-heading">
              <span>01</span>
              <div>
                <small>PERSONAL INFORMATION</small>
                <h3>वैयक्तिक माहिती</h3>
              </div>
            </div>
          </Reveal>

          <div className="biodata-grid">
            {biodataPersonal.map(([label, value, Icon], index) => (
              <Reveal key={label} delay={(index % 3) * 0.05}>
                <motion.div className="biodata-card" whileHover={{ y: -6, scale: 1.015 }}>
                  <div className="biodata-icon"><Icon size={18} /></div>
                  <div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="biodata-card-line" />
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="biodata-category">
          <Reveal>
            <div className="category-heading">
              <span>02</span>
              <div>
                <small>TRADITIONAL DETAILS</small>
                <h3>जन्म व पारंपरिक माहिती</h3>
              </div>
            </div>
          </Reveal>

          <div className="biodata-grid">
            {biodataTraditional.map(([label, value, Icon], index) => (
              <Reveal key={label} delay={(index % 3) * 0.06}>
                <motion.div className="biodata-card" whileHover={{ y: -6, scale: 1.015 }}>
                  <div className="biodata-icon"><Icon size={18} /></div>
                  <div>
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <div className="biodata-card-line" />
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>

        <div className="biodata-category">
          <Reveal>
            <div className="category-heading">
              <span>03</span>
              <div>
                <small>FAMILY & PROFESSIONAL</small>
                <h3>कुटुंब व व्यवसाय</h3>
              </div>
            </div>
          </Reveal>

          <div className="biodata-family-card">
            {biodataFamily.map(([label, value, Icon], index) => (
              <Reveal key={label} delay={index * 0.04}>
                <motion.div className="family-biodata-row" whileHover={{ x: 7 }}>
                  <div className="family-biodata-icon"><Icon size={17} /></div>
                  <div className="family-biodata-info">
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                  <ArrowRight size={16} className="family-biodata-arrow" />
                </motion.div>
              </Reveal>
            ))}

            <Reveal delay={0.3}>
              <div className="relatives-biodata">
                <Sparkles size={18} />
                <div>
                  <span>नातेवाईक</span>
                  <p>{relatives}</p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="contact" className="contact">
        <div className="contact-circle" />

        <Reveal>
          <p className="section-label">06 — CONTACT</p>
          <h2>Let&apos;s<br /><span>connect.</span></h2>
          <p className="contact-description">
            Interested in connecting or knowing more about me? Feel free to get in touch.
          </p>

          <div className="contact-buttons">
            <MagneticButton href="tel:+919689645942">
              <Phone size={17} /> +91 9689645942 <ArrowRight size={16} />
            </MagneticButton>

            <MagneticButton href="mailto:your@email.com" secondary>
              <Mail size={17} /> Email Me
            </MagneticButton>
          </div>

          <div className="contact-location">
            <MapPin size={16} />
            Mu. Po. Takrwan, Ta. Majalgaon, Dist. Beed, Maharashtra
          </div>
        </Reveal>
      </section>

      <footer>
        <div className="footer-logo">VR<span>.</span></div>
        <p>© {new Date().getFullYear()} Vishal Raut</p>
        <p>Designed & Built with Next.js</p>
      </footer>
    </main>
  );
}
