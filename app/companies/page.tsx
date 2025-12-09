"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Company {
  name: string;
  jobCount: number;
  activeJobCount: number;
  locations: string[];
  remoteAvailable: boolean;
  logoUrl?: string | null;
  fallbackColor?: string | null;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch companies
  useEffect(() => {
    async function fetchCompanies() {
      setLoading(true);
      const params = new URLSearchParams();

      if (debouncedSearchQuery) params.append('q', debouncedSearchQuery);

      try {
        const response = await fetch(`/api/companies?${params.toString()}`);
        const data = await response.json();
        const companiesData = data.companies || [];
        setCompanies(companiesData);

        // Automatically fetch logos for companies that don't have them
        const companiesWithoutLogos = companiesData
          .filter((c: Company) => !c.logoUrl)
          .map((c: Company) => c.name);

        if (companiesWithoutLogos.length > 0) {
          // Fetch logos in background without blocking UI
          fetch('/api/logos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companies: companiesWithoutLogos })
          })
            .then(res => res.json())
            .then(logoData => {
              // Update companies with fetched logos
              setCompanies(prev => prev.map(company => {
                const logoInfo = logoData.logos?.find((l: any) => l.company === company.name);
                if (logoInfo) {
                  return {
                    ...company,
                    logoUrl: logoInfo.logoUrl,
                    fallbackColor: logoInfo.fallbackColor
                  };
                }
                return company;
              }));
            })
            .catch(err => console.error('Error fetching logos:', err));
        }
      } catch (error) {
        console.error('Error fetching companies:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCompanies();
  }, [debouncedSearchQuery]);

  const getCompanyIcon = (company: string) => {
    const firstLetter = company.charAt(0).toUpperCase();
    return firstLetter;
  };

  const getRandomColor = (company: string) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const index = company.length % colors.length;
    return colors[index];
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FFF9F0' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: '#FFF9F0', borderColor: '#F5E6D3' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-2xl font-bold" style={{ color: '#F4A460' }}>
              SUNSHINE CAREERS
            </Link>
          </div>

          <nav className="flex items-center gap-8">
            <Link href="/" className="text-gray-700 hover:text-gray-900 font-medium">
              Find Jobs
            </Link>
            <Link href="/companies" className="text-gray-900 font-semibold" style={{ color: '#F4A460' }}>
              Companies
            </Link>
            <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Resources</a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
              <span className="text-sm">👤</span>
            </div>
            <div className="relative">
              <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-lg">🔔</span>
              </button>
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                1
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Page Title & Search */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Explore Companies</h1>
          <p className="text-gray-600 mb-6">Discover companies hiring on our platform</p>

          <div className="bg-white rounded-3xl shadow-sm p-6" style={{ border: '1px solid #F5E6D3' }}>
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ borderColor: '#E5D5C0' }}>
              <span className="text-gray-400">🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search companies by name..."
                className="flex-1 outline-none text-gray-700 placeholder-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Companies Grid */}
        {loading ? (
          <div className="text-center py-20 text-gray-600">Loading companies...</div>
        ) : companies.length === 0 ? (
          <div className="text-center py-20 text-gray-600">
            No companies found. Try a different search!
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-gray-600">
              Showing {companies.length} {companies.length === 1 ? 'company' : 'companies'}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <Link
                  key={company.name}
                  href={`/?q=${encodeURIComponent(company.name)}`}
                  className="company-card group"
                >
                  <div className="flex items-start gap-4">
                    {/* Company Logo/Icon */}
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
                      style={{
                        backgroundColor: company.logoUrl ? '#f5f5f5' : (company.fallbackColor || getRandomColor(company.name))
                      }}
                    >
                      {company.logoUrl ? (
                        <img
                          src={company.logoUrl}
                          alt={`${company.name} logo`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to letter icon if image fails to load
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement!.innerHTML = `<span class="text-white font-bold text-2xl">${getCompanyIcon(company.name)}</span>`;
                            e.currentTarget.parentElement!.style.backgroundColor = company.fallbackColor || getRandomColor(company.name);
                          }}
                        />
                      ) : (
                        <span className="text-white font-bold text-2xl">
                          {getCompanyIcon(company.name)}
                        </span>
                      )}
                    </div>

                    {/* Company Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                        {company.name}
                      </h3>

                      <div className="space-y-1 text-sm text-gray-600">
                        <p className="font-medium" style={{ color: '#F4A460' }}>
                          {company.activeJobCount} active {company.activeJobCount === 1 ? 'position' : 'positions'}
                        </p>

                        {company.remoteAvailable && (
                          <div className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#FFE4B5', color: '#8B6914' }}>
                            Remote Available
                          </div>
                        )}

                        {company.locations.length > 0 && (
                          <p className="text-xs text-gray-500 truncate">
                            📍 {company.locations.slice(0, 2).join(', ')}
                            {company.locations.length > 2 && ` +${company.locations.length - 2} more`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* View Jobs Arrow */}
                  <div className="mt-3 pt-3 border-t flex items-center justify-between text-sm" style={{ borderColor: '#F5E6D3' }}>
                    <span className="text-gray-600">View open positions</span>
                    <span className="text-gray-400 group-hover:text-gray-600 transition-colors">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t" style={{ borderColor: '#F5E6D3' }}>
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2024 SUNSHINE CAREERS. All rights reserved.</p>

            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-gray-900">Find Jobs</Link>
              <Link href="/companies" className="hover:text-gray-900">Companies</Link>
              <a href="#" className="hover:text-gray-900">Resources</a>

              <div className="flex items-center gap-3 ml-4">
                <a href="#" className="hover:opacity-70">𝕏</a>
                <a href="#" className="hover:opacity-70">📘</a>
                <a href="#" className="hover:opacity-70">📷</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
