"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Home,
  BarChart3,
  Newspaper,
  GraduationCap,
} from "lucide-react";

const navItems = [
  { href: "/", label: "今日学习", icon: Home },
  { href: "/study", label: "单词学习", icon: BookOpen },
  { href: "/reading", label: "阅读训练", icon: Newspaper },
  { href: "/stats", label: "学习数据", icon: BarChart3 },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-100 bottom-nav-safe
                    md:top-0 md:bottom-auto md:border-t-0 md:border-b md:pb-0">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between md:justify-start md:gap-1">
          <Link
            href="/"
            className="hidden md:flex items-center gap-2 px-4 py-3 mr-4 text-ink font-semibold"
          >
            <GraduationCap className="w-5 h-5 text-primary-500" />
            <span className="text-sm">英语加速器</span>
          </Link>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || 
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col md:flex-row items-center gap-0.5 md:gap-2 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-colors",
                  isActive
                    ? "text-primary-600 bg-primary-50 md:bg-transparent md:text-primary-600"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-tertiary"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] md:text-sm md:font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
