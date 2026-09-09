"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { MailAccount } from "@/lib/accounts"

export interface Mailbox extends MailAccount {
  id: string
  created_at: string
}

interface MailboxContextValue {
  mailboxes: Mailbox[]
  loading: boolean
}

const MailboxContext = createContext<MailboxContextValue>({
  mailboxes: [],
  loading: true,
})

/**
 * Loads the mailbox list and keeps it live. Edits made in the settings dialog
 * (or in another tab) arrive over Realtime, so every consumer — sidebar,
 * composer, message labels — updates without a refresh.
 */
export function MailboxProvider({ children }: { children: React.ReactNode }) {
  const [mailboxes, setMailboxes] = useState<Mailbox[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data } = await supabase
        .from("mailboxes")
        .select("id, address, name, created_at")
        .order("created_at", { ascending: true })
      if (!active) return
      setMailboxes((data ?? []) as Mailbox[])
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
    <MailboxContext.Provider value={{ mailboxes, loading }}>
      {children}
    </MailboxContext.Provider>
  )
}

export function useMailboxes() {
  return useContext(MailboxContext)
}
