"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

export type ClientOption = {
  id: number;
  client_number?: number | null;
  name: string | null;
  company_name?: string | null;
};

export type ClientSearchSelectProps = {
  clients: ClientOption[];
  value: string | number | null | undefined;
  onChange: (clientId: string, client?: ClientOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  theme?: "dark" | "light";
};

function normalizeSearchText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatClientDisplay(client: ClientOption): string {
  const numberPrefix = client.client_number
    ? `${String(client.client_number).padStart(3, "0")} - `
    : "";
  const name = client.name || "Sin nombre";
  const company =
    client.company_name && client.company_name !== client.name
      ? ` (${client.company_name})`
      : "";
  return `${numberPrefix}${name}${company}`;
}

export default function ClientSearchSelect({
  clients,
  value,
  onChange,
  placeholder = "Buscar cliente por nombre o número...",
  disabled = false,
  className = "",
  id,
  name,
  theme = "dark",
}: ClientSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const stringValue = value !== null && value !== undefined ? String(value) : "";

  // Selected client object
  const selectedClient = useMemo(() => {
    if (!stringValue) return null;
    return clients.find((c) => String(c.id) === stringValue) || null;
  }, [clients, stringValue]);

  // Sort clients alphabetically by name (handling Spanish locale & accents)
  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const nameA = (a.name || a.company_name || "").trim().toLowerCase();
      const nameB = (b.name || b.company_name || "").trim().toLowerCase();
      if (!nameA && !nameB) {
        return (a.client_number || 0) - (b.client_number || 0);
      }
      if (!nameA) return 1;
      if (!nameB) return -1;
      return nameA.localeCompare(nameB, "es", { sensitivity: "base" });
    });
  }, [clients]);

  // Filter clients based on user query
  const filteredClients = useMemo(() => {
    const clean = normalizeSearchText(searchQuery);
    if (!clean) return sortedClients;

    return sortedClients.filter((client) => {
      const nameNorm = normalizeSearchText(client.name);
      const companyNorm = normalizeSearchText(client.company_name);
      const numStr = client.client_number ? String(client.client_number) : "";
      const numPadded = client.client_number
        ? String(client.client_number).padStart(3, "0")
        : "";

      return (
        nameNorm.includes(clean) ||
        companyNorm.includes(clean) ||
        numStr.includes(clean) ||
        numPadded.includes(clean)
      );
    });
  }, [sortedClients, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Scroll active item into view when highlighted index changes
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const itemElement = listRef.current.children[
        highlightedIndex
      ] as HTMLElement | undefined;
      if (itemElement) {
        itemElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  function handleSelect(client: ClientOption) {
    onChange(String(client.id), client);
    setIsOpen(false);
    setSearchQuery("");
    setHighlightedIndex(-1);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", null);
    setSearchQuery("");
    setHighlightedIndex(-1);
    setIsOpen(false);
    inputRef.current?.focus();
  }

  function handleInputFocus() {
    if (disabled) return;
    setIsOpen(true);
    setHighlightedIndex(-1);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchQuery(e.target.value);
    if (!isOpen) {
      setIsOpen(true);
    }
    setHighlightedIndex(-1);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else if (filteredClients.length > 0) {
        setHighlightedIndex((prev) =>
          prev < filteredClients.length - 1 ? prev + 1 : 0
        );
      }
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(filteredClients.length - 1);
      } else if (filteredClients.length > 0) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredClients.length - 1
        );
      }
      return;
    }

    if (e.key === "Enter") {
      if (isOpen) {
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredClients.length
        ) {
          handleSelect(filteredClients[highlightedIndex]);
        } else if (filteredClients.length === 1) {
          handleSelect(filteredClients[0]);
        }
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setSearchQuery("");
      setHighlightedIndex(-1);
      inputRef.current?.blur();
      return;
    }

    if (e.key === "Tab") {
      setIsOpen(false);
      setSearchQuery("");
      setHighlightedIndex(-1);
    }
  }

  // Display value for input:
  // When dropdown is open, show whatever user is typing (or empty if they haven't typed yet to start searching)
  // When dropdown is closed, show selected client label
  const inputValue = isOpen
    ? searchQuery
    : selectedClient
      ? formatClientDisplay(selectedClient)
      : "";

  const isDark = theme === "dark";

  return (
    <div
      ref={containerRef}
      className={`relative w-full ${className}`}
      data-testid="client-search-select-container"
    >
      {/* Hidden native input for form compatibility */}
      {name && <input type="hidden" name={name} value={stringValue} />}

      <div
        className={`group flex min-h-[48px] w-full items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition ${
          disabled
            ? isDark
              ? "border-[#2A2A30] bg-[#1B1B1F] opacity-60 cursor-not-allowed"
              : "border-black/10 bg-[#EFEFEF] opacity-60 cursor-not-allowed"
            : isOpen
              ? isDark
                ? "border-[#9E1B32] bg-[#222228] ring-1 ring-[#9E1B32]/40"
                : "border-[#7A1F2B] bg-white ring-1 ring-[#7A1F2B]/40"
              : isDark
                ? "border-[#2A2A30] bg-[#222228] hover:border-[#3E3E48]"
                : "border-black/10 bg-[#F7F6F3] hover:border-black/20"
        }`}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        }}
      >
        <Search
          size={16}
          className={`flex-shrink-0 transition ${
            isOpen
              ? isDark
                ? "text-[#9E1B32]"
                : "text-[#7A1F2B]"
              : isDark
                ? "text-[#77777D]"
                : "text-black/40"
          }`}
        />

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={
            selectedClient && isOpen
              ? `Actual: ${formatClientDisplay(selectedClient)}`
              : placeholder
          }
          autoComplete="off"
          spellCheck={false}
          className={`w-full bg-transparent text-sm font-normal outline-none transition ${
            isDark
              ? "text-white placeholder:text-[#77777D]"
              : "text-black placeholder:text-black/40"
          } ${disabled ? "cursor-not-allowed" : ""}`}
        />

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {stringValue && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              title="Limpiar cliente"
              className={`rounded-md p-1 transition ${
                isDark
                  ? "text-[#77777D] hover:bg-[#2A2A30] hover:text-white"
                  : "text-black/40 hover:bg-black/10 hover:text-black"
              }`}
            >
              <X size={14} />
            </button>
          )}

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) {
                if (isOpen) {
                  setIsOpen(false);
                  setSearchQuery("");
                } else {
                  inputRef.current?.focus();
                  setIsOpen(true);
                }
              }
            }}
            className={`rounded-md p-0.5 transition ${
              isDark ? "text-[#77777D]" : "text-black/40"
            }`}
          >
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div
          className={`absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border shadow-2xl backdrop-blur-xl transition-all ${
            isDark
              ? "border-[#2A2A30] bg-[#151518] text-white"
              : "border-black/10 bg-white text-black"
          }`}
        >
          <div
            ref={listRef}
            className="max-h-64 overflow-y-auto p-1.5 space-y-0.5"
            role="listbox"
          >
            {filteredClients.length === 0 ? (
              <div
                className={`py-4 px-3 text-center text-sm ${
                  isDark ? "text-[#77777D]" : "text-black/50"
                }`}
              >
                {searchQuery.trim() ? (
                  <>
                    No se encontraron clientes para{" "}
                    <span className="font-medium text-white">
                      &ldquo;{searchQuery}&rdquo;
                    </span>
                  </>
                ) : (
                  "No hay clientes registrados."
                )}
              </div>
            ) : (
              filteredClients.map((client, index) => {
                const isSelected = String(client.id) === stringValue;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={client.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(client)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                      isSelected
                        ? isDark
                          ? "bg-[#9E1B32]/15 text-white border border-[#9E1B32]/30 font-medium"
                          : "bg-[#7A1F2B]/10 text-[#7A1F2B] border border-[#7A1F2B]/20 font-medium"
                        : isHighlighted
                          ? isDark
                            ? "bg-[#222228] text-white"
                            : "bg-[#F5F4F0] text-black"
                          : isDark
                            ? "text-[#E0E0E6] hover:bg-[#222228] hover:text-white"
                            : "text-black/80 hover:bg-[#F5F4F0] hover:text-black"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
                      {client.client_number !== null &&
                        client.client_number !== undefined && (
                          <span
                            className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
                              isDark
                                ? "bg-[#222228] border border-[#2A2A30] text-[#B3B3B8]"
                                : "bg-black/5 border border-black/10 text-black/60"
                            }`}
                          >
                            {String(client.client_number).padStart(3, "0")}
                          </span>
                        )}

                      <div className="min-w-0 flex-1 truncate">
                        <div className="truncate font-medium">
                          {client.name || "Sin nombre"}
                        </div>
                        {client.company_name &&
                          client.company_name !== client.name && (
                            <div
                              className={`truncate text-xs ${
                                isDark ? "text-[#77777D]" : "text-black/45"
                              }`}
                            >
                              {client.company_name}
                            </div>
                          )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check
                        size={16}
                        className={`flex-shrink-0 ${
                          isDark ? "text-[#9E1B32]" : "text-[#7A1F2B]"
                        }`}
                      />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
