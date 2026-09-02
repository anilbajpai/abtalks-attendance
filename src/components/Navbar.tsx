"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

function getInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function UserAvatar({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(image) && !failed;

  if (showPhoto) {
    return (
      <img
        src={image!}
        alt={name || "User"}
        className="w-8 h-8 rounded-full object-cover bg-slate-200"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-semibold flex items-center justify-center"
      title={name || undefined}
      aria-label={name || "User"}
    >
      {getInitials(name)}
    </div>
  );
}

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isAdmin = session?.user?.role === "ADMIN";

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/calendar", label: "Calendar" },
    ...(isAdmin
      ? [
          { href: "/admin", label: "Admin" },
          { href: "/admin/payroll", label: "Payroll" },
        ]
      : []),
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AB</span>
              </div>
              <span className="font-semibold text-slate-900">ABTalks</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session?.user && (
              <>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-900">
                    {session.user.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isAdmin ? "Admin" : "Employee"}
                  </p>
                </div>
                <UserAvatar
                  name={session.user.name}
                  image={session.user.image}
                />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md hover:bg-slate-50"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
