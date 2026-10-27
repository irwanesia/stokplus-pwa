import { defineStore } from 'pinia'
import { ref } from 'vue'

import { writeAuditLog } from '@/db/audit'
import { saveSettings } from '@/db/settings'
import { downloadTextFile } from '@/utils/download'

import { getBackupReminderStatus, prepareBackup, restoreBackup } from '@/backup/service'
import type {
  BackupCreateOptions,
  BackupCreateResult,
  BackupPayload,
  BackupReminderStatus,
  RestoreBackupResult,
} from '@/backup/types'
import { useSessionStore } from '@/stores/session'

export const useBackupStore = defineStore('backup', () => {
  const reminder = ref<BackupReminderStatus | null>(null)
  const creating = ref(false)
  const restoring = ref(false)
  const lastError = ref('')

  const session = useSessionStore()

  async function refreshReminder(): Promise<void> {
    reminder.value = await getBackupReminderStatus()
  }

  async function createBackup(options: BackupCreateOptions): Promise<BackupCreateResult> {
    creating.value = true
    lastError.value = ''

    try {
      const result = await prepareBackup(options)
      downloadTextFile(result.filename, result.content)

      await saveSettings({
        last_backup_at: result.file.exportedAt,
        last_backup_size: result.size,
        last_backup_transaction_count: result.transactionCount,
        backup_encryption_default: result.encrypted,
      })
      await session.refreshSettings()

      await writeAuditLog({
        action: 'backup_created',
        entity: 'backup',
        payload: {
          filename: result.filename,
          size: result.size,
          encrypted: result.encrypted,
          transactionCount: result.transactionCount,
          counts: result.payload.counts,
        },
      })

      await refreshReminder()
      return result
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Backup gagal dibuat.'
      throw error
    } finally {
      creating.value = false
    }
  }

  async function restore(
    payload: BackupPayload,
    options: { fileSize: number; encrypted: boolean },
  ): Promise<RestoreBackupResult> {
    restoring.value = true
    lastError.value = ''

    try {
      const result = await restoreBackup(payload, {
        fileSize: options.fileSize,
        encrypted: options.encrypted,
        onSafetyBackup: (safety) => {
          downloadTextFile(safety.filename, safety.content)
        },
      })

      await session.initialize()
      await refreshReminder()
      return result
    } catch (error) {
      lastError.value = error instanceof Error ? error.message : 'Restore gagal.'
      throw error
    } finally {
      restoring.value = false
    }
  }

  return {
    reminder,
    creating,
    restoring,
    lastError,
    refreshReminder,
    createBackup,
    restore,
  }
})
