#!/usr/bin/env node
/**
 * Script to fix duplicate stock records in the database
 * This script removes duplicate stock entries for the same product_id + warehouse_id combination
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixDuplicateStock() {
  console.log('🔍 Checking for duplicate stock records...\n')

  try {
    // Step 1: Find duplicates
    const { data: allStock, error: fetchError } = await supabase
      .from('stock')
      .select('id, product_id, warehouse_id, quantity, last_updated')
      .order('product_id')
      .order('warehouse_id')
      .order('last_updated', { ascending: false })

    if (fetchError) {
      console.error('❌ Error fetching stock records:', fetchError)
      return
    }

    console.log(`📦 Total stock records: ${allStock.length}`)

    // Group by product_id + warehouse_id
    const grouped = new Map()
    allStock.forEach(record => {
      const key = `${record.product_id}_${record.warehouse_id}`
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key).push(record)
    })

    // Find duplicates
    let duplicateGroups = 0
    let recordsToDelete = []

    grouped.forEach((records, key) => {
      if (records.length > 1) {
        duplicateGroups++
        console.log(`\n🔴 Found ${records.length} duplicates for key: ${key}`)

        // Sort by last_updated (most recent first)
        records.sort((a, b) => new Date(b.last_updated) - new Date(a.last_updated))

        // Keep the first (most recent), mark others for deletion
        const toKeep = records[0]
        const toDelete = records.slice(1)

        console.log(`  ✅ Keeping: ID=${toKeep.id}, Quantity=${toKeep.quantity}, Updated=${toKeep.last_updated}`)
        toDelete.forEach(record => {
          console.log(`  ❌ Deleting: ID=${record.id}, Quantity=${record.quantity}, Updated=${record.last_updated}`)
          recordsToDelete.push(record.id)
        })
      }
    })

    if (duplicateGroups === 0) {
      console.log('\n✅ No duplicate stock records found!')
      return
    }

    console.log(`\n📊 Summary:`)
    console.log(`   - Duplicate groups found: ${duplicateGroups}`)
    console.log(`   - Records to delete: ${recordsToDelete.length}`)

    // Step 2: Delete duplicates
    console.log('\n🗑️  Deleting duplicate records...')

    for (const id of recordsToDelete) {
      const { error: deleteError } = await supabase
        .from('stock')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error(`❌ Error deleting record ${id}:`, deleteError)
      } else {
        console.log(`✅ Deleted record ${id}`)
      }
    }

    console.log('\n✅ Duplicate cleanup completed!')

    // Step 3: Verify no duplicates remain
    console.log('\n🔍 Verifying cleanup...')

    const { data: verifyStock } = await supabase
      .from('stock')
      .select('product_id, warehouse_id')

    const verifyGrouped = new Map()
    verifyStock.forEach(record => {
      const key = `${record.product_id}_${record.warehouse_id}`
      verifyGrouped.set(key, (verifyGrouped.get(key) || 0) + 1)
    })

    let stillHasDuplicates = false
    verifyGrouped.forEach((count, key) => {
      if (count > 1) {
        console.log(`⚠️  Still has ${count} records for: ${key}`)
        stillHasDuplicates = true
      }
    })

    if (!stillHasDuplicates) {
      console.log('✅ Verification passed: No duplicates remain!')
    } else {
      console.log('⚠️  Warning: Some duplicates still exist. You may need to run this script again.')
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Run the script
fixDuplicateStock()
  .then(() => {
    console.log('\n✨ Script completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
