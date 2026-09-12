"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react"
import { supabase } from "@/lib/supabase"
import type { MailAccount } from "@/lib/accounts"

export interface Mailbox extends MailAccount {
  id: string
  created_at: string
  /** Storage path of the mailbox photo. Absent until the avatar migration runs. */
  avatar_path?: string | null
}

interface MailboxContextValue {
  mailboxes: Mailbox[]
  loading: boolean
  /** Refetch now, e.g. right after a change, instead of waiting on Realtime. */
  refresh: () => Promise<void>
}

const MailboxContext = createContext<MailboxContextValue>({
  mailboxes: [],
  loading: true,
  refresh: async () => {},
})

/** Reads the list. Null on failure, so callers keep the last good list. */
async function fetchMailboxes(): Promise<Mailbox[] | null> {
  const { data, error } = await supabase
    .from("mailboxes")
    // `*` rather than a column list: naming avatar_path would make this query
    // fail — and the whole mailbox list vanish — on a database that has not
    // had the avatar migration yet.
    .select("*")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("[mailboxes] load error", error)
    return null
  }
  return (data ?? []) as Mailbox[]
}

/**
 * Loads the mailbox list and keeps it live. The settings dialog refreshes
 * directly after each change; Realtime covers edits made in other tabs.
 */
export function MailboxProvider({ children }: { children: React.ReactNode }) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await fetchMailboxes()
    if (list) setMailboxes(list)
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    // Inline rather than calling `refresh`: state is only set after the await,
    // which is what keeps this effect clear of cascading synchronous renders.
    const load = async () => {
      const list = await fetchMailboxes()
      if (!active) return
      if (list) setMailboxes(list)
      setLoading(false)
    }

    load()

    // Any change to the table is rare and the list is tiny, so refetch whole
    // rather than patching each event.
    const channel = supabase
      .channel("mailboxes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mailboxes" },
        () => load()
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <MailboxContext.Provider value={{ mailboxes, loading, refresh }}>
      {children}
    </MailboxContext.Provider>
  )
}

export function useMailboxes() {
  return useContext(MailboxContext)
}
