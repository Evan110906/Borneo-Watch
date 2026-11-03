"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
	Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Bookmark, Check,
	ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Compass, Download, Filter,
	Globe2, Leaf, ListFilter, MapPin, Menu, Moon, MoreHorizontal, Plus, Search,
	Settings2, ShieldCheck, Sun, TreePine, Upload, X,
} from "lucide-react";
import {
	Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
	Tooltip, XAxis, YAxis,
} from "recharts";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { MapCategory, MapReport, MapViewProps } from "@/app/map-view";

const MapView = dynamic<MapViewProps>(() => import("@/app/map-view").then((module) => module.default), {
	ssr: false,
	loading: () => <div className="map-loading">Loading forest map...</div>,
});

type Category = MapCategory;
type Report = MapReport & { status: "Pending Review" | "Under Review" | "Verified" | "Rejected"; author: string; createdAt: string };
type Section = "Overview" | "Forest Map" | "Community Reports" | "Biodiversity" | "Environmental Analytics" | "Education Center" | "About BorneoWatch";
type SpeciesProfile = { name: string; latin: string; group: string; status: string; habitat: string; source: string; url: string; imageUrl: string; imageAlt: string };
type EducationArticle = { title: string; category: string; read: string; summary: string; color: string; imageUrl: string; imageAlt: string; content?: string; sourceName?: string; sourceUrl?: string };

const categories: Category[] = ["Forest degradation", "Waste pollution", "Wildlife sighting", "River pollution", "Other"];
const categoryColors: Record<Category, string> = {
	"Forest degradation": "#ad654c", "Waste pollution": "#c69037", "Wildlife sighting": "#628c51",
	"River pollution": "#438ba0", Other: "#797b70",
};
const speciesPhotos: Record<string, { imageUrl: string; imageAlt: string }> = {
	"Pongo pygmaeus": { imageUrl: "https://images.unsplash.com/photo-1762301394049-78983b63e909?auto=format&fit=crop&w=1200&q=85", imageAlt: "Orangutan clinging to a tree branch in forest canopy" },
	"Nasalis larvatus": { imageUrl: "https://images.unsplash.com/photo-1760408333958-4a419d7dcb5c?auto=format&fit=crop&w=1200&q=85", imageAlt: "Proboscis monkey with its distinctive long nose" },
	"Elephas maximus borneensis": { imageUrl: "https://images.unsplash.com/photo-1654180623810-fe0d6b5dd4cc?auto=format&fit=crop&w=1200&q=85", imageAlt: "Asian elephant standing in a tropical forest in Malaysia; illustrative, not identified to Bornean subspecies" },
	"Buceros rhinoceros": { imageUrl: "https://images.unsplash.com/photo-1725997415055-1935a3ffc2c4?auto=format&fit=crop&w=1200&q=85", imageAlt: "Colorful-beaked hornbill perched on a branch in Malaysia" },
	"Barbourula kalimantanensis": { imageUrl: "https://images.unsplash.com/photo-1780086279581-c2191d988af1?auto=format&fit=crop&w=1200&q=85", imageAlt: "Green tree frog in Virginia; illustrative amphibian photo, not the Bornean flat-headed frog" },
	"Eusideroxylon zwageri": { imageUrl: "https://images.unsplash.com/photo-1777175308549-3298ceafab87?auto=format&fit=crop&w=1200&q=85", imageAlt: "Tropical mangrove canopy beside a calm river; illustrative forest habitat" },
};
const articleImages: Record<string, { imageUrl: string; imageAlt: string }> = {
	peatland: { imageUrl: "https://images.unsplash.com/photo-1777175308549-3298ceafab87?auto=format&fit=crop&w=1600&q=85", imageAlt: "Tropical mangrove wetland lining a calm river; illustrative ecosystem image" },
	orangutan: { imageUrl: "https://images.unsplash.com/photo-1762301394049-78983b63e909?auto=format&fit=crop&w=1600&q=85", imageAlt: "Orangutan clinging to a tree branch in forest canopy" },
	river: { imageUrl: "https://images.unsplash.com/photo-1761998940280-eec36b52f196?auto=format&fit=crop&w=1600&q=85", imageAlt: "Stilt houses reflected in calm river water with lush forest behind" },
	stewardship: { imageUrl: "https://images.unsplash.com/photo-1758599669016-acedd3942ca2?auto=format&fit=crop&w=1600&q=85", imageAlt: "Volunteers collecting rubbish along a riverbank" },
};
const initialReports: Report[] = [
	{ id: "BW-104", title: "Clearing observed near Sungai Wain", category: "Forest degradation", description: "A community observer noticed a new clearing along the edge of the protected forest. This report has not been independently verified.", location: "Sungai Wain, East Kalimantan", lat: -1.15, lng: 116.87, status: "Under Review", author: "Rina P.", createdAt: "2026-10-28" },
	{ id: "BW-103", title: "Plastic waste along the riverbank", category: "Waste pollution", description: "Plastic packaging and household waste have collected at a bend in the river after recent rain.", location: "Samarinda, East Kalimantan", lat: -0.5, lng: 117.15, status: "Pending Review", author: "Community member", createdAt: "2026-10-25" },
	{ id: "BW-102", title: "Proboscis monkey group sighting", category: "Wildlife sighting", description: "A small group was seen in mangrove trees at dusk. Observation shared by a local nature group.", location: "Kumai, Central Kalimantan", lat: -2.74, lng: 111.73, status: "Pending Review", author: "Dimas A.", createdAt: "2026-10-22" },
	{ id: "BW-101", title: "Cloudy water downstream", category: "River pollution", description: "Water appeared unusually cloudy near the downstream footpath. Cause is unknown and requires follow-up.", location: "Kapuas Hulu, West Kalimantan", lat: 0.83, lng: 112.93, status: "Verified", author: "Local river watch", createdAt: "2026-10-18" },
	{ id: "BW-100", title: "Hornbill heard at forest edge", category: "Wildlife sighting", description: "A rhinoceros hornbill call was heard just before sunrise. No photograph was taken.", location: "Malinau, North Kalimantan", lat: 3.58, lng: 116.64, status: "Pending Review", author: "S. Wulandari", createdAt: "2026-10-14" },
	{ id: "BW-099", title: "Smoke visible near village road", category: "Other", description: "Smoke was visible from the village road in the afternoon. The source has not been confirmed.", location: "Ketapang, West Kalimantan", lat: -1.84, lng: 109.97, status: "Under Review", author: "Community member", createdAt: "2026-10-09" },
	{ id: "BW-098", title: "Illegal dumping beside access track", category: "Waste pollution", description: "Household waste was found beside an access track. Shared for local follow-up.", location: "Balikpapan, East Kalimantan", lat: -1.24, lng: 116.86, status: "Pending Review", author: "Rina P.", createdAt: "2026-10-03" },
];
const species: SpeciesProfile[] = [
	{ name: "Bornean orangutan", latin: "Pongo pygmaeus", group: "Mammals", status: "Critically Endangered", habitat: "Lowland and peat-swamp forests", source: "IUCN Red List", url: "https://www.iucnredlist.org/species/17975/123809220", ...speciesPhotos["Pongo pygmaeus"] },
	{ name: "Proboscis monkey", latin: "Nasalis larvatus", group: "Mammals", status: "Endangered", habitat: "Mangroves and riverine forests", source: "IUCN Red List", url: "https://www.iucnredlist.org/species/14352/17945165", ...speciesPhotos["Nasalis larvatus"] },
	{ name: "Bornean pygmy elephant", latin: "Elephas maximus borneensis", group: "Mammals", status: "Endangered", habitat: "Lowland forests of northeastern Borneo", source: "IUCN Red List", url: "https://www.iucnredlist.org/species/7140/45818198", ...speciesPhotos["Elephas maximus borneensis"] },
	{ name: "Rhinoceros hornbill", latin: "Buceros rhinoceros", group: "Birds", status: "Vulnerable", habitat: "Mature lowland and hill forests", source: "IUCN Red List", url: "https://www.iucnredlist.org/species/22682464/92948145", ...speciesPhotos["Buceros rhinoceros"] },
	{ name: "Bornean flat-headed frog", latin: "Barbourula kalimantanensis", group: "Amphibians", status: "Endangered", habitat: "Clean, fast-flowing forest streams", source: "IUCN Red List", url: "https://www.iucnredlist.org/species/54499/11153304", ...speciesPhotos["Barbourula kalimantanensis"] },
	{ name: "Borneo ironwood", latin: "Eusideroxylon zwageri", group: "Plants", status: "Vulnerable", habitat: "Lowland mixed dipterocarp forests", source: "IUCN Red List", url: "https://www.iucnredlist.org/species/31316/2805329", ...speciesPhotos["Eusideroxylon zwageri"] },
];
const articles: EducationArticle[] = [
	{ title: "Why peatlands matter to Borneo", category: "Ecosystems", read: "6 min", summary: "A field guide to the waterlogged landscapes that store carbon, regulate water, and support distinctive wildlife.", color: "moss", ...articleImages.peatland },
	{ title: "Living alongside orangutans", category: "Wildlife", read: "8 min", summary: "What habitat connectivity means for orangutan populations and the communities sharing the forest.", color: "clay", ...articleImages.orangutan },
	{ title: "Reading a river ecosystem", category: "Waterways", read: "5 min", summary: "Simple ways to notice change in a river, and how to document an observation responsibly.", color: "water", ...articleImages.river },
	{ title: "Community forest stewardship", category: "Conservation", read: "7 min", summary: "Local knowledge and long-term care are central to keeping forest landscapes resilient.", color: "leaf", ...articleImages.stewardship },
];
const monthlyReports = [
	{ month: "May", reports: 14 }, { month: "Jun", reports: 19 }, { month: "Jul", reports: 16 },
	{ month: "Aug", reports: 27 }, { month: "Sep", reports: 23 }, { month: "Oct", reports: 31 },
];
const navItems: { label: Section; icon: typeof Activity }[] = [
	{ label: "Overview", icon: Activity }, { label: "Forest Map", icon: MapPin },
	{ label: "Community Reports", icon: ListFilter }, { label: "Biodiversity", icon: Leaf },
	{ label: "Environmental Analytics", icon: Globe2 }, { label: "Education Center", icon: Bookmark },
	{ label: "About BorneoWatch", icon: CircleHelp },
];

function formattedDate(date: string) {
	return new Date(`${date}T12:00:00`).toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" });
}

export default function Home() {
	const [section, setSection] = useState<Section>("Overview");
	const [reports, setReports] = useState<Report[]>(isSupabaseConfigured() ? [] : initialReports);
	const [speciesProfiles, setSpeciesProfiles] = useState<SpeciesProfile[]>(species);
	const [educationArticles, setEducationArticles] = useState<EducationArticle[]>(articles);
	const [query, setQuery] = useState("");
	const [reportOpen, setReportOpen] = useState(false);
	const [toast, setToast] = useState("");
	const [mobileOpen, setMobileOpen] = useState(false);
	const [darkMode, setDarkMode] = useState(false);
	const [profileOpen, setProfileOpen] = useState(false);
	const [notificationOpen, setNotificationOpen] = useState(false);
	const [reportFilter, setReportFilter] = useState("All categories");
	const [reportPage, setReportPage] = useState(0);
	const [analyticsRange, setAnalyticsRange] = useState("90 days");
	const [analyticsCategory, setAnalyticsCategory] = useState("All categories");
	const [analyticsRegion, setAnalyticsRegion] = useState("All regions");
	const [speciesFilter, setSpeciesFilter] = useState("All species");
	const [speciesQuery, setSpeciesQuery] = useState("");
	const [articleQuery, setArticleQuery] = useState("");
	const [bookmarks, setBookmarks] = useState<string[]>([]);
	const [selectedReport, setSelectedReport] = useState<Report | null>(null);
	const [authUser, setAuthUser] = useState<User | null>(null);
	const [authOpen, setAuthOpen] = useState(false);
	const [authRecovery, setAuthRecovery] = useState(false);
	const [profileEditOpen, setProfileEditOpen] = useState(false);
	const [isAdmin, setIsAdmin] = useState(false);

	useEffect(() => {
		const client = getSupabaseBrowserClient();
		if (client) {
			let active = true;
			void client.auth.getSession().then(({ data }) => {
				if (active) setAuthUser(data.session?.user ?? null);
			});
			const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
				setAuthUser(session?.user ?? null);
				if (event === "PASSWORD_RECOVERY") {
					setAuthRecovery(true);
					setAuthOpen(true);
				}
			});
			void client.from("environmental_reports")
				.select("id, title, category, description, location_text, latitude, longitude, status, user_id, created_at")
				.order("created_at", { ascending: false })
				.then(({ data, error }) => {
					if (!active) return;
					if (error) {
						setToast("Could not load reports from Supabase. Check the migration and Row Level Security policies.");
						return;
					}
					setReports((data ?? []).map((row) => ({
						id: row.id,
						title: row.title,
						category: row.category as Category,
						description: row.description,
						location: row.location_text,
						lat: row.latitude,
						lng: row.longitude,
						status: row.status as Report["status"],
						author: row.user_id.slice(0, 8),
						createdAt: row.created_at.slice(0, 10),
					})));
				});
			void client.from("biodiversity_species")
				.select("common_name, scientific_name, species_group, conservation_status, habitat, source_name, source_url")
				.order("common_name")
				.then(({ data, error }) => {
					if (!active || error || !data?.length) return;
					setSpeciesProfiles(data.map((row) => ({
						...speciesPhotos[row.scientific_name],
						name: row.common_name,
						latin: row.scientific_name,
						group: row.species_group,
						status: row.conservation_status,
						habitat: row.habitat,
						source: row.source_name,
						url: row.source_url,
						imageUrl: speciesPhotos[row.scientific_name]?.imageUrl || speciesPhotos["Eusideroxylon zwageri"].imageUrl,
						imageAlt: speciesPhotos[row.scientific_name]?.imageAlt || "Tropical forest habitat; illustrative image",
					})));
				});
			void client.from("educational_articles")
				.select("title, category, summary, content, source_name, source_url")
				.order("created_at")
				.then(({ data, error }) => {
					if (!active || error || !data?.length) return;
					const colors: Record<string, string> = { Ecosystems: "moss", Wildlife: "clay", Waterways: "water", Conservation: "leaf" };
					setEducationArticles(data.map((row) => ({
						...articles.find((article) => article.title === row.title),
						title: row.title,
						category: row.category,
						read: "Editorial",
						summary: row.summary,
						color: colors[row.category] ?? "moss",
						imageUrl: articles.find((article) => article.title === row.title)?.imageUrl ?? articleImages.peatland.imageUrl,
						imageAlt: articles.find((article) => article.title === row.title)?.imageAlt ?? "Tropical wetland forest; illustrative image",
						content: row.content,
						sourceName: row.source_name,
						sourceUrl: row.source_url,
					})));
				});
			return () => { active = false; subscription.unsubscribe(); };
		}
		const timer = window.setTimeout(() => {
			try {
				const savedReports = localStorage.getItem("borneowatch-reports");
				const savedBookmarks = localStorage.getItem("borneowatch-bookmarks");
				if (savedReports) setReports([...JSON.parse(savedReports), ...initialReports]);
				if (savedBookmarks) setBookmarks(JSON.parse(savedBookmarks));
			} catch {
				setToast("Saved demo data could not be loaded. Showing sample records.");
			}
		}, 0);
		return () => window.clearTimeout(timer);
	}, []);
	useEffect(() => {
		const client = getSupabaseBrowserClient();
		if (!client || !authUser) return;
		let active = true;
		void client.from("article_bookmarks").select("educational_articles(title)").eq("user_id", authUser.id)
			.then(({ data }) => {
				if (!active) return;
				const rows = (data ?? []) as unknown as { educational_articles: { title: string } | null }[];
				setBookmarks(rows.flatMap((row) => row.educational_articles ? [row.educational_articles.title] : []));
			});
		return () => { active = false; };
	}, [authUser]);
	useEffect(() => {
		const client = getSupabaseBrowserClient();
		if (!client) return;
		if (!authUser) {
			const timer = window.setTimeout(() => setIsAdmin(false), 0);
			return () => window.clearTimeout(timer);
		}
		let active = true;
		void client.from("profiles").select("role").eq("id", authUser.id).maybeSingle()
			.then(({ data }) => { if (active) setIsAdmin(data?.role === "administrator"); });
		return () => { active = false; };
	}, [authUser]);
	useEffect(() => {
		if (!toast) return;
		const timer = window.setTimeout(() => setToast(""), 3600);
		return () => window.clearTimeout(timer);
	}, [toast]);

	const visibleReports = useMemo(() => reports.filter((report) => {
		const matchesQuery = `${report.title} ${report.location} ${report.category}`.toLowerCase().includes(query.toLowerCase());
		return matchesQuery && (reportFilter === "All categories" || report.category === reportFilter);
	}), [reports, query, reportFilter]);
	const filteredSpecies = useMemo(() => speciesProfiles.filter((item) => {
		const matchesQuery = `${item.name} ${item.latin}`.toLowerCase().includes(speciesQuery.toLowerCase());
		return matchesQuery && (speciesFilter === "All species" || item.group === speciesFilter);
	}), [speciesProfiles, speciesQuery, speciesFilter]);
	const analyticsRegions = Array.from(new Set(reports.map((report) => report.location.split(",").at(-1)?.trim() ?? "Unspecified"))).sort();
	const analyticsReports = useMemo(() => {
		const latestReportTime = Math.max(0, ...reports.map((report) => new Date(`${report.createdAt}T23:59:59`).getTime()));
		const cutoff = analyticsRange === "All demo records" ? null : latestReportTime - Number.parseInt(analyticsRange, 10) * 24 * 60 * 60 * 1000;
		return reports.filter((report) => {
			const region = report.location.split(",").at(-1)?.trim() ?? "Unspecified";
			const afterCutoff = cutoff === null || new Date(`${report.createdAt}T23:59:59`).getTime() >= cutoff;
			return afterCutoff
				&& (analyticsCategory === "All categories" || report.category === analyticsCategory)
				&& (analyticsRegion === "All regions" || region === analyticsRegion);
		});
	}, [reports, analyticsRange, analyticsCategory, analyticsRegion]);

	const submitReport = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const form = event.currentTarget;
		const formData = new FormData(form);
		const title = String(formData.get("title") ?? "").trim();
		const category = String(formData.get("category")) as Category;
		const description = String(formData.get("description") ?? "").trim();
		const location = String(formData.get("location") ?? "").trim();
		const lat = Number(formData.get("lat"));
		const lng = Number(formData.get("lng"));
		const image = formData.get("photo");
		if (!title || !description || !location || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
		if (image instanceof File && image.size > 5 * 1024 * 1024) {
			setToast("Image must be 5 MB or smaller.");
			return;
		}
		const client = getSupabaseBrowserClient();
		if (client && !authUser) {
			setReportOpen(false);
			setAuthOpen(true);
			setToast("Sign in before submitting a report to the configured database.");
			return;
		}
		if (client && authUser) {
			const { data, error } = await client.from("environmental_reports").insert({
				user_id: authUser.id,
				title,
				category,
				description,
				location_text: location,
				latitude: lat,
				longitude: lng,
			}).select("id, title, category, description, location_text, latitude, longitude, status, user_id, created_at").single();
			if (error) {
				setToast(`Report was not saved: ${error.message}`);
				return;
			}
			const savedReport: Report = {
				id: data.id,
				title: data.title,
				category: data.category as Category,
				description: data.description,
				location: data.location_text,
				lat: data.latitude,
				lng: data.longitude,
				status: data.status as Report["status"],
				author: authUser.user_metadata.display_name ?? authUser.email ?? "Registered member",
				createdAt: data.created_at.slice(0, 10),
			};
			if (image instanceof File && image.size > 0) {
				const path = `${authUser.id}/${data.id}/${crypto.randomUUID()}-${image.name.replace(/[^\\w.-]/g, "_")}`;
				const { error: uploadError } = await client.storage.from("report-images").upload(path, image, { contentType: image.type });
				if (!uploadError) {
					const { error: imageRowError } = await client.from("report_images").insert({ report_id: data.id, storage_path: path, content_type: image.type });
					if (imageRowError) setToast("Report saved, but its image could not be attached.");
				} else {
					setToast("Report saved, but its image could not be uploaded.");
				}
			}
			setReports((current) => [savedReport, ...current]);
			setReportOpen(false);
			setSection("Community Reports");
			if (!image || !(image instanceof File) || image.size === 0) setToast("Report saved to Supabase and marked pending review.");
			form.reset();
			return;
		}
		const report: Report = { id: `DEMO-${Date.now().toString().slice(-5)}`, title, category, description, location, lat, lng, status: "Pending Review", author: "Demo visitor", createdAt: new Date().toISOString().slice(0, 10) };
		const updated = [report, ...reports];
		setReports(updated);
		localStorage.setItem("borneowatch-reports", JSON.stringify(updated.filter((item) => item.id.startsWith("DEMO-"))));
		setReportOpen(false);
		setSection("Community Reports");
		setToast("Demo report saved on this device. It is pending review and is not publicly verified.");
		form.reset();
	};
	const toggleBookmark = async (title: string) => {
		const updated = bookmarks.includes(title) ? bookmarks.filter((item) => item !== title) : [...bookmarks, title];
		const client = getSupabaseBrowserClient();
		if (client && !authUser) {
			setAuthOpen(true);
			setToast("Sign in to save bookmarks to your account.");
			return;
		}
		if (client && authUser) {
			const { data: article, error: articleError } = await client.from("educational_articles").select("id").eq("title", title).maybeSingle();
			if (articleError || !article) {
				setToast("Article is not available in the configured database yet.");
				return;
			}
			const result = bookmarks.includes(title)
				? await client.from("article_bookmarks").delete().eq("user_id", authUser.id).eq("article_id", article.id)
				: await client.from("article_bookmarks").insert({ user_id: authUser.id, article_id: article.id });
			if (result.error) {
				setToast(`Bookmark was not saved: ${result.error.message}`);
				return;
			}
			setBookmarks(updated);
			setToast(updated.includes(title) ? "Article bookmarked to your account." : "Bookmark removed.");
			return;
		}
		setBookmarks(updated);
		localStorage.setItem("borneowatch-bookmarks", JSON.stringify(updated));
		setToast(updated.includes(title) ? "Article bookmarked on this device." : "Bookmark removed.");
	};
	const exportCsv = (source = visibleReports) => {
		const lines = [["ID", "Title", "Category", "Location", "Status", "Date"], ...source.map((item) => [item.id, item.title, item.category, item.location, item.status, item.createdAt])];
		const csv = lines.map((row) => row.map((field) => `"${String(field).replaceAll('"', '""')}"`).join(",")).join("\n");
		const link = document.createElement("a");
		const objectUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
		link.href = objectUrl;
		link.download = section === "Environmental Analytics" ? "borneowatch-demo-analytics.csv" : "borneowatch-demo-reports.csv";
		link.click();
		window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
	};
	const goTo = (item: Section) => { setSection(item); setMobileOpen(false); setQuery(""); };
	const signOut = async () => {
		const client = getSupabaseBrowserClient();
		if (!client) return;
		const { error } = await client.auth.signOut();
		setProfileOpen(false);
		setToast(error ? `Could not sign out: ${error.message}` : "You have been signed out.");
	};
	const moderateReport = async (id: string, status: Report["status"]) => {
		const client = getSupabaseBrowserClient();
		if (!client || !authUser || !isAdmin) return;
		const { error } = await client.from("environmental_reports").update({
			status,
			reviewed_by: authUser.id,
			reviewed_at: new Date().toISOString(),
		}).eq("id", id);
		if (error) {
			setToast(`Moderation update was not saved: ${error.message}`);
			return;
		}
		setReports((current) => current.map((report) => report.id === id ? { ...report, status } : report));
		setToast(`Report status updated to ${status}.`);
	};

	return <div className={`app-shell${darkMode ? " dark" : ""}`}>
		<aside className={`sidebar${mobileOpen ? " sidebar-open" : ""}`}>
			<button className="brand" onClick={() => goTo("Overview")} aria-label="BorneoWatch overview"><span className="brand-mark"><TreePine size={22} strokeWidth={1.7} /></span><span className="brand-copy"><strong>borneowatch</strong><small>FIELD INTELLIGENCE</small></span></button>
			<div className="workspace-label">WORKSPACE <span>{isSupabaseConfigured() ? "CONNECTED" : "DEMO"}</span></div>
			<nav className="side-nav" aria-label="Main navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} onClick={() => goTo(label)} className={`nav-item${section === label ? " active" : ""}`}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === "Community Reports" && <span className="nav-count">{reports.length}</span>}</button>)}</nav>
			<div className="sidebar-bottom"><div className="coverage-card"><div className="coverage-icon"><Compass size={17} /></div><div><strong>Kalimantan</strong><span>INDONESIA · 5 PROVINCES</span></div><ArrowUpRight size={14} /></div><div className="user-mini"><div className="avatar">BW</div><div className="user-mini-copy"><strong>Demo explorer</strong><span>Visitor access</span></div><MoreHorizontal size={17} /></div><div className="sidebar-foot">Data shown is for demonstration only.</div></div>
		</aside>
		<div className="main-shell"><header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Open navigation"><Menu size={19} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{section}</strong></div><div className="top-actions"><label className="global-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports, places..." aria-label="Search reports and places" /><kbd>⌘ K</kbd></label><span className="demo-chip"><span />{isSupabaseConfigured() ? "SUPABASE" : "DEMO MODE"}</span><div className="popover-wrap"><button className="icon-button" onClick={() => setNotificationOpen(!notificationOpen)} aria-label="Notifications"><Bell size={18} /><i className="notification-dot" /></button>{notificationOpen && <div className="popover notification-popover"><strong>Activity</strong><p><span className="tiny-dot green" /> {isSupabaseConfigured() ? "Database connection is configured." : "Demo data is loaded for exploration."}</p><p><span className="tiny-dot gold" /> Community reports are not automatically verified.</p></div>}</div><button className="icon-button theme-toggle" onClick={() => setDarkMode(!darkMode)} aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button><div className="popover-wrap"><button className="profile-button" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}><span className="avatar small">{authUser?.email?.slice(0, 2).toUpperCase() ?? "BW"}</span><ChevronDown size={14} /></button>{profileOpen && <div className="popover profile-popover"><strong>{authUser?.user_metadata.display_name ?? authUser?.email ?? "Demo explorer"}</strong><span className="muted">{authUser ? "Registered user" : "Visitor · demo access"}</span><button onClick={() => authUser ? void signOut() : (setProfileOpen(false), setAuthOpen(true))}>{authUser ? "Sign out" : "Sign in or create account"}<ArrowRight size={14} /></button></div>}</div></div></header>
			<main className="page-content">
				{section === "Overview" && <Overview reports={reports} onNavigate={goTo} onReport={() => setReportOpen(true)} onSelectReport={setSelectedReport} />}
				{section === "Forest Map" && <MapSection reports={visibleReports} onReport={() => setReportOpen(true)} />}
				{section === "Community Reports" && <ReportsSection reports={visibleReports} filter={reportFilter} setFilter={(value) => { setReportFilter(value); setReportPage(0); }} page={reportPage} setPage={setReportPage} onReport={() => setReportOpen(true)} onExport={exportCsv} onSelect={setSelectedReport} />}
				{section === "Biodiversity" && <BiodiversitySection items={filteredSpecies} query={speciesQuery} setQuery={setSpeciesQuery} filter={speciesFilter} setFilter={setSpeciesFilter} />}
				{section === "Environmental Analytics" && <><div className="analytics-filter-bar"><label className="select-wrap"><span>Date range</span><select value={analyticsRange} onChange={(event) => setAnalyticsRange(event.target.value)}><option>30 days</option><option>90 days</option><option>All demo records</option></select><ChevronDown size={14} /></label><label className="select-wrap"><span>Category</span><select value={analyticsCategory} onChange={(event) => setAnalyticsCategory(event.target.value)}><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label><label className="select-wrap"><span>Region</span><select value={analyticsRegion} onChange={(event) => setAnalyticsRegion(event.target.value)}><option>All regions</option>{analyticsRegions.map((region) => <option key={region}>{region}</option>)}</select><ChevronDown size={14} /></label><span className="analytics-result-count">{analyticsReports.length} matching demo records</span></div><AnalyticsSection reports={analyticsReports} onExport={() => exportCsv(analyticsReports)} onNavigate={goTo} /></>}
				{section === "Education Center" && <EducationSection articles={educationArticles} query={articleQuery} setQuery={setArticleQuery} bookmarks={bookmarks} onBookmark={toggleBookmark} />}
				{section === "About BorneoWatch" && <AboutSection onNavigate={goTo} connected={isSupabaseConfigured()} />}
				{section === "About BorneoWatch" && authUser && <button className="button outline profile-edit-link" onClick={() => setProfileEditOpen(true)}>Edit your profile <ArrowRight size={14} /></button>}
				{section === "Community Reports" && isAdmin && <AdminModeration reports={reports} onModerate={moderateReport} />}
			</main>
		</div>
		{section === "Education Center" && <ReadingProgress />}
		<button className="floating-report" onClick={() => setReportOpen(true)}><Plus size={18} /><span>New observation</span></button>
		{reportOpen && <ReportModal onClose={() => setReportOpen(false)} onSubmit={submitReport} connected={isSupabaseConfigured()} />}
		{authOpen && <AuthModal key={authRecovery ? "password-recovery" : "account"} recovery={authRecovery} onClose={() => { setAuthOpen(false); setAuthRecovery(false); }} />}
		{profileEditOpen && authUser && <ProfileModal user={authUser} onClose={() => setProfileEditOpen(false)} onSignOut={signOut} onSaved={() => setToast("Profile updated.")} />}
		{selectedReport && <ReportDetail report={selectedReport} onClose={() => setSelectedReport(null)} />}
		{toast && <div className="toast" role="status"><Check size={17} />{toast}<button onClick={() => setToast("")} aria-label="Dismiss"><X size={15} /></button></div>}
	</div>;
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: React.ReactNode; description: string; action?: React.ReactNode }) {
	return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
function StatCard({ label, value, delta, icon, trend }: { label: string; value: string; delta: string; icon: React.ReactNode; trend: "up" | "flat" }) {
	return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className="stat-icon">{icon}</span></div><div className="stat-value">{value}</div><div className="stat-bottom"><span className={`trend ${trend}`}>{trend === "up" ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}{delta}</span><span>DEMO</span></div></div>;
}
function PanelHeading({ label, title, action, onAction }: { label: string; title: string; action: string; onAction: () => void }) {
	return <div className="panel-heading"><div><span className="eyebrow">{label}</span><h2>{title}</h2></div>{action && <button className="text-button" onClick={onAction}>{action}<ArrowRight size={14} /></button>}</div>;
}
function Overview({ reports, onNavigate, onReport, onSelectReport }: { reports: Report[]; onNavigate: (section: Section) => void; onReport: () => void; onSelectReport: (report: Report) => void }) {
	const recent = [...reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);
	return <><PageHeading eyebrow="TUESDAY, 3 NOVEMBER 2026 · FIELD OVERVIEW" title={<>A clearer view of <em>the forest.</em></>} description="Community observations and ecosystem knowledge across Kalimantan." action={<button className="button primary" onClick={onReport}><Plus size={16} /> Submit an observation</button>} />
		<div className="notice-strip"><div className="notice-icon"><ShieldCheck size={17} /></div><div><strong>Demonstration workspace</strong><span>Figures, reports, and map markers below are sample content, not verified environmental measurements.</span></div><button onClick={() => onNavigate("About BorneoWatch")}>About data <ArrowRight size={14} /></button></div>
		<section className="stat-grid" aria-label="Demo workspace statistics"><StatCard label="Community reports" value={String(reports.length).padStart(2, "0")} delta="sample records" icon={<Activity size={17} />} trend="up" /><StatCard label="Species profiles" value="06" delta="sourced references" icon={<Leaf size={17} />} trend="up" /><StatCard label="Contributors" value="12" delta="demo accounts" icon={<Globe2 size={17} />} trend="flat" /><StatCard label="Monitoring locations" value="18" delta="sample locations" icon={<MapPin size={17} />} trend="up" /></section>
		<section className="overview-grid"><div className="panel map-preview-panel"><PanelHeading label="SPATIAL OVERVIEW" title="Kalimantan field notes" action="Open full map" onAction={() => onNavigate("Forest Map")} /><div className="preview-map"><MapView reports={reports.slice(0, 6)} compact /><div className="map-caption"><span><i className="legend-dot forest" /> Community observations</span><span className="map-attribution">© OpenStreetMap</span></div></div><div className="map-footer"><div><MapPin size={14} /><span>5 provinces</span></div><span className="map-live"><span /> DEMO LOCATIONS</span></div></div>
			<div className="panel trend-panel"><PanelHeading label="COMMUNITY ACTIVITY" title="Reports over time" action="Explore analytics" onAction={() => onNavigate("Environmental Analytics")} /><div className="chart-context"><strong>130</strong><span>sample submissions · May–Oct</span><span className="chart-change"><ArrowUpRight size={14} /> demo trend</span></div><div className="chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyReports} margin={{ top: 10, right: 4, bottom: 0, left: -20 }}><defs><linearGradient id="forestFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#43815b" stopOpacity={0.2} /><stop offset="100%" stopColor="#43815b" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} dy={9} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} /><Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12 }} /><Area type="monotone" dataKey="reports" stroke="#31724b" strokeWidth={2.2} fill="url(#forestFill)" activeDot={{ r: 4, fill: "#31724b" }} /></AreaChart></ResponsiveContainer></div><div className="chart-foot"><span>Sample monthly reports</span><span>DEMO DATA</span></div></div></section>
		<section className="overview-grid lower-grid"><div className="panel reports-panel"><PanelHeading label="COMMUNITY SIGNALS" title="Recent observations" action="View all reports" onAction={() => onNavigate("Community Reports")} /><div className="recent-list">{recent.map((report) => <button className="recent-row" key={report.id} onClick={() => onSelectReport(report)}><span className="category-mark" style={{ backgroundColor: categoryColors[report.category] }}><MapPin size={14} /></span><span className="recent-copy"><strong>{report.title}</strong><span>{report.location}</span></span><span className="recent-date">{formattedDate(report.createdAt)}</span><ChevronRight size={15} className="row-arrow" /></button>)}</div></div><div className="panel focus-panel"><PanelHeading label="SPECIES SPOTLIGHT" title="Forest neighbors" action="Explore species" onAction={() => onNavigate("Biodiversity")} /><div className="species-feature"><div className="species-monogram orangutan">Pp</div><div><span className="species-tag">MAMMAL · IUCN RED LIST</span><h3>Bornean orangutan</h3><i>Pongo pygmaeus</i><div className="status-pill danger">Critically Endangered</div></div></div><div className="source-note"><ShieldCheck size={14} /><span>Conservation status sourced from the IUCN Red List. See profile for citation.</span></div></div></section>
		<section className="education-band"><div className="education-art"><TreePine size={34} strokeWidth={1.3} /><span>FIELD NOTES / 01</span></div><div className="education-text"><div className="eyebrow">LEARN · EDITORIAL SERIES</div><h2>Forest knowledge is a form of care.</h2><p>Explore explainers on peatlands, wildlife, rivers, and community stewardship.</p></div><button className="button outline" onClick={() => onNavigate("Education Center")}>Visit the learning center <ArrowRight size={15} /></button></section>
	</>;
}
function MapSection({ reports, onReport }: { reports: Report[]; onReport: () => void }) {
	const [selected, setSelected] = useState<string[]>(categories);
	const [layer, setLayer] = useState<"standard" | "humanitarian">("standard");
	const [locationSearch, setLocationSearch] = useState("");
	const [resetToken, setResetToken] = useState(0);
	const shown = reports.filter((report) => selected.includes(report.category) && report.location.toLowerCase().includes(locationSearch.toLowerCase()));
	return <><PageHeading eyebrow="SPATIAL INTELLIGENCE · KALIMANTAN" title={<>Forest <em>map.</em></>} description="Explore community-submitted observations. Markers are not satellite-verified." action={<button className="button primary" onClick={onReport}><Plus size={16} /> Add observation</button>} /><div className="map-toolbar"><label className="map-search"><Search size={16} /><input value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Filter by location name" /></label><label className="select-wrap"><span>Map layer</span><select value={layer} onChange={(event) => setLayer(event.target.value as typeof layer)}><option value="standard">OpenStreetMap</option><option value="humanitarian">Humanitarian</option></select><ChevronDown size={14} /></label><button className="button outline small" onClick={() => { setLocationSearch(""); setSelected(categories); setResetToken((token) => token + 1); }}><Compass size={15} /> Reset map &amp; filters</button></div><div className="map-layout"><div className="panel full-map-panel"><MapView reports={shown} layer={layer} resetToken={resetToken} /><div className="map-scale"><span><i className="legend-dot forest" /> {shown.length} sample observations</span><span>© OpenStreetMap contributors</span></div></div><aside className="panel map-sidebar"><div className="map-sidebar-head"><div><span className="eyebrow">MAP CONTROLS</span><h2>Observation layers</h2></div><Settings2 size={17} /></div><div className="filter-label">CATEGORIES <span>{shown.length} visible</span></div><div className="map-category-list">{categories.map((category) => <label key={category}><input type="checkbox" checked={selected.includes(category)} onChange={(event) => setSelected(event.target.checked ? [...selected, category] : selected.filter((item) => item !== category))} /><i style={{ backgroundColor: categoryColors[category] }} /><span>{category}</span><small>{reports.filter((report) => report.category === category).length}</small></label>)}</div><div className="map-caution"><ShieldCheck size={15} /><p>Observations are community-submitted and pending independent review unless explicitly labeled otherwise.</p></div><div className="map-locations"><span className="eyebrow">VISIBLE LOCATIONS</span>{shown.slice(0, 4).map((report) => <div key={report.id}><span className="tiny-dot" style={{ backgroundColor: categoryColors[report.category] }} /><span>{report.location}</span></div>)}</div></aside></div></>;
}
function ReportsSection({ reports, filter, setFilter, page, setPage, onReport, onExport, onSelect }: { reports: Report[]; filter: string; setFilter: (value: string) => void; page: number; setPage: (value: number) => void; onReport: () => void; onExport: () => void; onSelect: (report: Report) => void }) {
	const pageSize = 5; const pages = Math.max(1, Math.ceil(reports.length / pageSize));
	return <><PageHeading eyebrow="COMMUNITY-SUBMITTED · MODERATION QUEUE" title={<>Community <em>reports.</em></>} description="Observations shared by community members. Submissions are not treated as verified evidence." action={<button className="button primary" onClick={onReport}><Plus size={16} /> New report</button>} /><div className="report-summary"><div><span className="summary-number">{reports.length}</span><span>visible submissions</span></div><div><span className="status-dot pending" /> Pending review <strong>{reports.filter((report) => report.status === "Pending Review").length}</strong></div><div><span className="status-dot review" /> Under review <strong>{reports.filter((report) => report.status === "Under Review").length}</strong></div><button className="button outline small" onClick={onExport}><Download size={15} /> Export CSV</button></div><div className="panel table-panel"><div className="table-toolbar"><div><h2>Observation log</h2><span>Newest first · all contributors</span></div><label className="select-wrap filter-select"><Filter size={14} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><ChevronDown size={14} /></label></div><div className="table-scroll"><table><thead><tr><th>Observation</th><th>Category</th><th>Location</th><th>Submitted</th><th>Status</th><th /></tr></thead><tbody>{reports.slice(page * pageSize, (page + 1) * pageSize).map((report) => <tr key={report.id} onClick={() => onSelect(report)}><td><strong>{report.title}</strong><small>{report.id} · {report.author}</small></td><td><span className="table-category"><i style={{ backgroundColor: categoryColors[report.category] }} />{report.category}</span></td><td>{report.location}</td><td>{formattedDate(report.createdAt)}</td><td><StatusBadge status={report.status} /></td><td><button className="row-menu" aria-label={`View ${report.title}`}><ChevronRight size={16} /></button></td></tr>)}</tbody></table>{reports.length === 0 && <div className="empty-state"><Search size={22} /><strong>No matching observations</strong><span>Try changing the category filter or search term.</span></div>}</div><div className="table-pagination"><span>Showing {reports.length ? page * pageSize + 1 : 0}–{Math.min((page + 1) * pageSize, reports.length)} of {reports.length} submissions</span><div><button disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))} aria-label="Previous page"><ChevronLeft size={16} /></button><span>{page + 1} / {pages}</span><button disabled={page >= pages - 1} onClick={() => setPage(Math.min(pages - 1, page + 1))} aria-label="Next page"><ChevronRight size={16} /></button></div></div></div><p className="data-footnote"><ShieldCheck size={14} /> Demo entries only. Statuses show workflow states and are not an endorsement of environmental claims.</p></>;
}
function StatusBadge({ status }: { status: string }) { return <span className={`status-badge ${status.toLowerCase().replaceAll(" ", "-")}`}><i />{status}</span>; }
function ReadingProgress() {
	const [progress, setProgress] = useState(0);
	useEffect(() => {
		const updateProgress = (event: Event) => {
			const panel = event.target;
			if (!(panel instanceof HTMLElement) || !panel.classList.contains("article-detail")) return;
			const scrollableHeight = panel.scrollHeight - panel.clientHeight;
			const nextProgress = scrollableHeight > 0 ? Math.round((panel.scrollTop / scrollableHeight) * 100) : 100;
			const clampedProgress = Math.min(100, Math.max(0, nextProgress));
			setProgress(clampedProgress);
			const title = panel.querySelector("h2")?.textContent ?? "current";
			try { sessionStorage.setItem(`borneowatch-reading:${title}`, String(clampedProgress)); } catch {}
		};
		document.addEventListener("scroll", updateProgress, true);
		return () => document.removeEventListener("scroll", updateProgress, true);
	}, []);
	return <div className="reading-progress" role="progressbar" aria-label="Article reading progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div>;
}
function AdminModeration({ reports, onModerate }: { reports: Report[]; onModerate: (id: string, status: Report["status"]) => void }) {
	const reviewQueue = reports.filter((report) => report.status === "Pending Review" || report.status === "Under Review");
	return <section className="panel admin-queue"><div className="panel-heading"><div><span className="eyebrow">ADMINISTRATOR ONLY · DATABASE ROLE REQUIRED</span><h2>Review queue</h2></div><ShieldCheck size={17} /></div>{reviewQueue.length ? <div className="admin-queue-list">{reviewQueue.map((report) => <div key={report.id}><div><strong>{report.title}</strong><span>{report.id} · {report.location}</span></div><label><span className="sr-only">Update status for {report.title}</span><select value={report.status} onChange={(event) => onModerate(report.id, event.target.value as Report["status"])}><option>Pending Review</option><option>Under Review</option><option>Verified</option><option>Rejected</option></select></label></div>)}</div> : <p className="admin-queue-empty">No pending submissions require review.</p>}</section>;
}
function BiodiversitySection({ items, query, setQuery, filter, setFilter }: { items: typeof species; query: string; setQuery: (value: string) => void; filter: string; setFilter: (value: string) => void }) {
	const [selectedSpecies, setSelectedSpecies] = useState<(typeof species)[number] | null>(null);
	const groups = ["All species", "Mammals", "Birds", "Reptiles", "Amphibians", "Plants"];
	return <>
		<PageHeading eyebrow="SPECIES DIRECTORY · SOURCED PROFILES" title={<>Borneo&apos;s living <em>library.</em></>} description="A small, cited selection of species associated with Kalimantan. Conservation status links to the IUCN Red List." />
		<div className="directory-toolbar">
			<label className="directory-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search common or scientific name" /></label>
			<div className="segmented" role="group" aria-label="Filter by species category">{groups.map((group) => <button key={group} className={filter === group ? "selected" : ""} onClick={() => setFilter(group)}>{group}</button>)}</div>
			<span className="result-count">{items.length} profiles</span>
		</div>
		{items.length ? <div className="species-grid">{items.map((item, index) => <button key={item.name} className={`species-card species-card-${index % 4}`} onClick={() => setSelectedSpecies(item)}>
			<div className="species-art"><Image src={item.imageUrl} alt={item.imageAlt} fill sizes="(max-width: 680px) 50vw, (max-width: 930px) 50vw, 33vw" className="species-photo object-cover transition-transform duration-300" /><div className="species-art-shade" /><small>{item.group.toUpperCase()}</small></div>
			<div className="species-card-body"><div className="species-card-status"><span className={`status-dot ${item.status === "Critically Endangered" || item.status === "Endangered" ? "danger" : "caution"}`} />{item.status}</div><h2>{item.name}</h2><i>{item.latin}</i><div className="species-habitat"><TreePine size={14} />{item.habitat}</div><div className="species-card-link">View sourced profile <ArrowUpRight size={14} /></div></div>
		</button>)}</div> : <div className="empty-state standalone"><Search size={22} /><strong>No species found</strong><span>Try a different search or category.</span></div>}
		<div className="source-banner"><ShieldCheck size={17} /><div><strong>Conservation information is referenced, not independently assessed here.</strong><span>Each profile links to a third-party source. Taxonomy and assessment dates can change; consult the source record for the latest information.</span></div><a href="https://www.iucnredlist.org/" target="_blank" rel="noreferrer">IUCN Red List <ArrowUpRight size={13} /></a></div>
		{selectedSpecies && <div className="modal-backdrop" onClick={() => setSelectedSpecies(null)}><section className="detail-modal species-detail" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSelectedSpecies(null)} aria-label="Close species details"><X size={18} /></button><div className="species-detail-photo"><Image src={selectedSpecies.imageUrl} alt={selectedSpecies.imageAlt} fill sizes="(max-width: 680px) 100vw, 420px" className="species-photo object-cover" /></div><span className="eyebrow">{selectedSpecies.group.toUpperCase()} · SOURCED PROFILE</span><h2>{selectedSpecies.name}</h2><i>{selectedSpecies.latin}</i><div className="detail-status"><span className="eyebrow">CONSERVATION STATUS</span><StatusBadge status={selectedSpecies.status} /></div><div className="detail-row"><span>Habitat</span><strong>{selectedSpecies.habitat}</strong></div><div className="detail-row"><span>Source</span><a href={selectedSpecies.url} target="_blank" rel="noreferrer">{selectedSpecies.source} <ArrowUpRight size={13} /></a></div><p className="detail-disclaimer">This profile summarizes referenced information for educational use. It does not represent a new scientific assessment or community sighting.</p></section></div>}
	</>;
}
function AnalyticsSection({ reports, onExport, onNavigate }: { reports: Report[]; onExport: () => void; onNavigate: (section: Section) => void }) {
	const data = categories.map((category) => ({ name: category.replace(" ", "\n"), reports: reports.filter((report) => report.category === category).length, color: categoryColors[category] }));
	return <><PageHeading eyebrow="ENVIRONMENTAL ANALYTICS · SAMPLE DATA" title={<>Signals, not <em>certainty.</em></>} description="Explore demonstration report activity. These charts describe sample app records, not measured environmental conditions." action={<button className="button outline" onClick={onExport}><Download size={15} /> Export CSV</button>} /><div className="analytics-warning"><ShieldCheck size={16} /><span>DEMO DATASET</span><p>All values on this page are illustrative software demo records. They must not be used as evidence of real-world environmental trends.</p></div><div className="analytics-kpis"><div><span>Submissions in current demo set</span><strong>{reports.length}</strong><small>Community records</small></div><div><span>Most common category</span><strong>{data.slice().sort((a, b) => b.reports - a.reports)[0]?.name.replace("\n", " ") ?? "—"}</strong><small>In sample submissions</small></div><div><span>Status pending review</span><strong>{reports.filter((report) => report.status === "Pending Review").length}</strong><small>Workflow state only</small></div></div><div className="analytics-grid"><div className="panel analytics-chart-panel"><PanelHeading label="SAMPLE APPLICATION RECORDS" title="Monthly report activity" action="Community reports" onAction={() => onNavigate("Community Reports")} /><div className="analytics-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyReports}><defs><linearGradient id="analyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5a8b61" stopOpacity={0.22} /><stop offset="100%" stopColor="#5a8b61" stopOpacity={0.01} /></linearGradient></defs><CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 4" /><XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--muted)", fontSize: 11 }} /><Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="reports" stroke="#31724b" fill="url(#analyticsFill)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div><p className="chart-footnote">Sample app records · May–October 2026</p></div><div className="panel category-chart-panel"><PanelHeading label="BREAKDOWN" title="By report category" action="" onAction={() => {}} /><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="reports" nameKey="name" innerRadius="60%" outerRadius="82%" paddingAngle={3} stroke="none">{data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{reports.length}</strong><span>records</span></div></div><div className="chart-legend">{data.map((item) => <div key={item.name}><i style={{ background: item.color }} /><span>{item.name.replace("\n", " ")}</span><strong>{item.reports}</strong></div>)}</div></div></div></>;
}
function EducationSection({ articles: articleList, query, setQuery, bookmarks, onBookmark }: { articles: EducationArticle[]; query: string; setQuery: (value: string) => void; bookmarks: string[]; onBookmark: (title: string) => void }) {
	const [category, setCategory] = useState("All topics");
	const [activeArticle, setActiveArticle] = useState<EducationArticle | null>(null);
	const filtered = articleList.filter((article) => `${article.title} ${article.summary}`.toLowerCase().includes(query.toLowerCase()) && (category === "All topics" || article.category === category));
	return <>
		<PageHeading eyebrow="EDUCATION CENTER · EDITORIAL CONTENT" title={<>Learn from the <em>landscape.</em></>} description="Short explainers about Borneo&apos;s ecosystems and the people working to protect them." />
		<div className="education-toolbar">
			<label className="directory-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the learning center" /></label>
			<div className="segmented">{["All topics", "Ecosystems", "Wildlife", "Waterways", "Conservation"].map((item) => <button key={item} className={category === item ? "selected" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
			<button className="button outline small" onClick={() => { setCategory("All topics"); setQuery(""); }}>Reset</button>
		</div>
		<div className="article-grid">{filtered.map((article, index) => <article className="article-card" key={article.title}>
			<div className="article-art"><Image src={article.imageUrl} alt={article.imageAlt} fill sizes="(max-width: 680px) 100vw, 50vw" className="article-photo object-cover transition-transform duration-300" /><div className="article-art-shade" /><span>FIELD GUIDE · 0{index + 1}</span><button onClick={() => onBookmark(article.title)} aria-label={bookmarks.includes(article.title) ? "Remove bookmark" : "Bookmark article"} className={`bookmark-button${bookmarks.includes(article.title) ? " bookmarked" : ""}`}><Bookmark size={16} fill={bookmarks.includes(article.title) ? "currentColor" : "none"} /></button></div>
			<div className="article-body"><div className="article-meta"><span>{article.category}</span><span>{article.read} read</span></div><h2>{article.title}</h2><p>{article.summary}</p><button className="text-button" onClick={() => setActiveArticle(article)}>Read article <ArrowRight size={14} /></button></div>
		</article>)}</div>
		{filtered.length === 0 && <div className="empty-state standalone"><Search size={22} /><strong>No articles match</strong><span>Try a different phrase or topic.</span></div>}
		<div className="editorial-note"><span className="eyebrow">EDITORIAL NOTE</span><p>These sample learning materials are introductory editorial content, not field guidance. Citations will be attached to topic-specific references as the library grows.</p><span>Reading progress is stored only for the current browser session.</span></div>
		{activeArticle && <div className="modal-backdrop" onClick={() => setActiveArticle(null)}><article className="detail-modal article-detail" onClick={(event) => event.stopPropagation()}>
			<button className="modal-close" onClick={() => setActiveArticle(null)} aria-label="Close article"><X size={18} /></button>
			<div className="article-detail-art"><Image src={activeArticle.imageUrl} alt={activeArticle.imageAlt} fill sizes="(max-width: 680px) 100vw, 530px" className="article-photo object-cover" /><div className="article-art-shade" /><span>EDITORIAL · {activeArticle.category.toUpperCase()}</span></div>
			<div className="article-meta"><span>{activeArticle.category}</span><span>{activeArticle.read} read</span></div><h2>{activeArticle.title}</h2><p>{activeArticle.summary}</p>
			<p>{activeArticle.content ?? "Borneo's forests are connected landscapes. Forest cover, waterways, wildlife, and local livelihoods shape one another. This sample article is editorial and intended as an introduction."}</p>
			<p>This introductory sample is editorial content for demonstration. Consult local experts and cited scientific sources before using information for decisions or field work.</p>
			{activeArticle.sourceUrl && <a className="article-source-link" href={activeArticle.sourceUrl} target="_blank" rel="noreferrer">Source: {activeArticle.sourceName ?? "Reference"} <ArrowUpRight size={14} /></a>}
			<button className="button outline" onClick={() => onBookmark(activeArticle.title)}><Bookmark size={15} /> {bookmarks.includes(activeArticle.title) ? "Saved to bookmarks" : "Save article"}</button>
		</article></div>}
	</>;
}
function AboutSection({ onNavigate, connected }: { onNavigate: (section: Section) => void; connected: boolean }) {
	return <><PageHeading eyebrow="ABOUT THE PLATFORM" title={<>Technology in service of <em>stewardship.</em></>} description="BorneoWatch is a concept for community-led environmental awareness across Kalimantan." /><section className="about-intro"><div className="about-mark"><TreePine size={46} strokeWidth={1.2} /><span>BW / 01</span></div><div><div className="eyebrow">OUR PURPOSE</div><h2>Local observations deserve a thoughtful place to be seen.</h2><p>BorneoWatch brings community observations, species references, and educational material into one accessible workspace. It is designed to support awareness and conversation, not replace scientific monitoring or local expertise.</p><p>“Protecting Borneo Through Data, Technology, and Community.”</p></div></section><div className="about-principles"><div><span>01</span><h3>Be transparent</h3><p>Every sample record is labeled demo data. Community observations remain distinct from verified evidence.</p></div><div><span>02</span><h3>Respect sources</h3><p>Species status links to established references. Educational content is editorial and identified as such.</p></div><div><span>03</span><h3>Keep people in control</h3><p>Submissions and bookmarks use {connected ? "your configured Supabase project with Row Level Security." : "this browser only and are not sent to a server."} Production use requires server-side review and access policies.</p></div></div><div className="setup-panel"><div><span className="eyebrow">DEPLOYMENT STATUS</span><h2>{connected ? "Supabase is configured" : "Demo mode is active"}</h2><p>{connected ? "Authentication and report storage use the configured Supabase project. Reference charts and sample insights remain demonstration content." : "No Supabase credentials are configured. Submissions and bookmarks remain in this browser and are not sent to a server."}</p></div><div className="setup-state"><span className={`status-dot ${connected ? "verified" : "pending"}`} />{connected ? "Database enabled" : "Local demonstration"}</div></div><div className="about-links"><button onClick={() => onNavigate("Forest Map")}><MapPin size={17} /> Explore the map <ArrowRight size={15} /></button><button onClick={() => onNavigate("Biodiversity")}><Leaf size={17} /> Browse biodiversity <ArrowRight size={15} /></button><button onClick={() => onNavigate("Education Center")}><Bookmark size={17} /> Visit education center <ArrowRight size={15} /></button></div></>;
}
function ReportModal({ onClose, onSubmit, connected }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>; connected: boolean }) {
	const [coordinates, setCoordinates] = useState({ lat: "-1.0", lng: "114.0" });
	const [photoName, setPhotoName] = useState("");
	const [saving, setSaving] = useState(false);
	const handleMapPick = (lat: number, lng: number) => setCoordinates({ lat: lat.toFixed(5), lng: lng.toFixed(5) });
	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		setSaving(true);
		try { await onSubmit(event); } finally { setSaving(false); }
	};
	return <div className="modal-backdrop" onClick={onClose}><section className="report-modal" onClick={(event) => event.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">COMMUNITY CONTRIBUTION · {connected ? "SUPABASE" : "DEMO MODE"}</span><h2>Share an observation</h2><p>{connected ? "Your report will be stored as pending review." : "Submissions are saved in this browser and marked pending review."}</p></div><button className="modal-close" onClick={onClose} aria-label="Close report form"><X size={18} /></button></div><form onSubmit={handleSubmit}><label className="form-field">Observation title<input name="title" required maxLength={100} placeholder="What did you observe?" /></label><div className="form-row"><label className="form-field">Category<select name="category" required defaultValue="Forest degradation">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="form-field">Location<input name="location" required maxLength={100} placeholder="Village, river, or landmark" /></label></div><label className="form-field">Description<textarea name="description" required minLength={20} maxLength={1000} placeholder="Describe what you observed, when it happened, and any relevant context." rows={4} /></label><div className="coordinate-header"><span className="form-label">LOCATION COORDINATES</span><span>Click the map to place a pin</span></div><div className="pick-map"><MapView reports={[]} onMapClick={handleMapPick} picker pickedPoint={[Number(coordinates.lat), Number(coordinates.lng)]} /><div className="map-picker-hint"><MapPin size={13} /> Select a point on the map</div></div><div className="form-row coordinate-row"><label className="form-field">Latitude<input name="lat" type="number" min="-90" max="90" step="any" required value={coordinates.lat} onChange={(event) => setCoordinates({ ...coordinates, lat: event.target.value })} /></label><label className="form-field">Longitude<input name="lng" type="number" min="-180" max="180" step="any" required value={coordinates.lng} onChange={(event) => setCoordinates({ ...coordinates, lng: event.target.value })} /></label></div><label className="upload-field"><Upload size={16} /><span>{photoName || "Attach a supporting photo"}<small>{connected ? "Optional · JPG, PNG, WebP or HEIC · max 5 MB" : "Optional · Demo uploads are not stored"}</small></span><input name="photo" type="file" accept="image/jpeg,image/png,image/webp,image/heic" onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")} /></label><div className="form-disclaimer"><ShieldCheck size={14} /><span>Community-submitted observations are not automatically verified. Do not include sensitive personal information.</span></div><div className="modal-actions"><button type="button" className="button outline" onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={saving}><Plus size={15} />{saving ? "Submitting..." : "Submit for review"}</button></div></form></section></div>;
}

function AuthModal({ onClose, recovery = false }: { onClose: () => void; recovery?: boolean }) {
	const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset" | "update-password">(recovery ? "update-password" : "sign-in");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const submit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError("");
		setMessage("");
		const client = getSupabaseBrowserClient();
		if (!client) {
			setError("Authentication is not enabled. Add the Supabase URL and public anon key to .env.local, then run the database migration.");
			return;
		}
		setBusy(true);
		try {
			if (mode === "update-password") {
				const { error: authError } = await client.auth.updateUser({ password });
				if (authError) throw authError;
				setMessage("Your password has been updated.");
				setPassword("");
			} else if (mode === "reset") {
				const { error: authError } = await client.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/` });
				if (authError) throw authError;
				setMessage("If the email belongs to an account, a password reset link is on its way.");
			} else if (mode === "sign-up") {
				const { data, error: authError } = await client.auth.signUp({ email, password, options: { data: { display_name: displayName.trim() } } });
				if (authError) throw authError;
				if (data.session) onClose();
				else setMessage("Check your email to confirm your new account.");
			} else {
				const { error: authError } = await client.auth.signInWithPassword({ email, password });
				if (authError) throw authError;
				onClose();
			}
		} catch (authError) {
			setError(authError instanceof Error ? authError.message : "Authentication could not be completed.");
		} finally {
			setBusy(false);
		}
	};
	return <div className="modal-backdrop" onClick={onClose}><section className="detail-modal auth-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close account dialog"><X size={18} /></button><span className="eyebrow">BORNEOWATCH ACCOUNT</span><h2>{mode === "sign-up" ? "Create your account" : mode === "reset" ? "Reset your password" : mode === "update-password" ? "Choose a new password" : "Welcome back"}</h2><p className="auth-intro">{mode === "reset" ? "We'll email a secure reset link if the account exists." : mode === "update-password" ? "Choose a new password for your account." : "Sign in to submit observations and save articles to your account."}</p><form onSubmit={submit}>{mode === "sign-up" && <label className="form-field">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={60} autoComplete="name" /></label>}{mode !== "update-password" && <label className="form-field">Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>}{mode !== "reset" && <label className="form-field auth-password">{mode === "update-password" ? "New password" : "Password"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "sign-up" || mode === "update-password" ? "new-password" : "current-password"} /></label>}{error && <p className="auth-error" role="alert">{error}</p>}{message && <p className="auth-message" role="status">{message}</p>}<button className="button primary auth-submit" type="submit" disabled={busy}>{busy ? "Working..." : mode === "sign-up" ? "Create account" : mode === "reset" ? "Send reset link" : mode === "update-password" ? "Update password" : "Sign in"}</button></form><div className="auth-switches">{mode === "sign-in" && <button onClick={() => setMode("reset")}>Forgot password?</button>}{mode !== "sign-in" && mode !== "update-password" && <button onClick={() => { setMode("sign-in"); setError(""); setMessage(""); }}>Back to sign in</button>}{mode !== "sign-up" && mode !== "update-password" && <button onClick={() => { setMode("sign-up"); setError(""); setMessage(""); }}>Create account</button>}</div></section></div>;
}
function ProfileModal({ user, onClose, onSignOut, onSaved }: { user: User; onClose: () => void; onSignOut: () => void; onSaved: () => void }) {
	const [displayName, setDisplayName] = useState(String(user.user_metadata.display_name ?? ""));
	const [error, setError] = useState("");
	const [saving, setSaving] = useState(false);
	const save = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const client = getSupabaseBrowserClient();
		if (!client) return;
		setSaving(true);
		setError("");
		const profileResult = await client.from("profiles").update({ display_name: displayName.trim() }).eq("id", user.id);
		if (profileResult.error) {
			setError(profileResult.error.message);
			setSaving(false);
			return;
		}
		const userResult = await client.auth.updateUser({ data: { display_name: displayName.trim() } });
		if (userResult.error) {
			setError(userResult.error.message);
			setSaving(false);
			return;
		}
		onSaved();
		onClose();
		setSaving(false);
	};
	return <div className="modal-backdrop" onClick={onClose}><section className="detail-modal profile-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close profile editor"><X size={18} /></button><span className="eyebrow">ACCOUNT PROFILE</span><h2>Edit your profile</h2><form onSubmit={save}><label className="form-field">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={60} /></label><label className="form-field">Email<input value={user.email ?? ""} readOnly /></label>{error && <p className="auth-error" role="alert">{error}</p>}<div className="modal-actions"><button type="button" className="button outline" onClick={onSignOut}>Sign out</button><button type="submit" className="button primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button></div></form></section></div>;
}
function ReportDetail({ report, onClose }: { report: Report; onClose: () => void }) {
	return <div className="modal-backdrop" onClick={onClose}><section className="detail-modal report-detail" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close report"><X size={18} /></button><span className="eyebrow">COMMUNITY OBSERVATION · {report.id}</span><h2>{report.title}</h2><StatusBadge status={report.status} /><div className="report-detail-meta"><span><MapPin size={14} />{report.location}</span><span>{formattedDate(report.createdAt)} · {report.author}</span></div><div className="report-detail-category"><i style={{ backgroundColor: categoryColors[report.category] }} />{report.category}</div><p className="report-description">{report.description}</p><div className="report-detail-map"><MapView reports={[report]} compact /></div><div className="form-disclaimer"><ShieldCheck size={14} /><span>Demo submission. Not independently verified or permanently stored.</span></div></section></div>;
}
