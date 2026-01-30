#!/usr/bin/env node
/**
 * Script to check current stock data and identify issues
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStockData() {
  console.log('🔍 Checking current stock data...\n')

  try {
    // Get all products with stock
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        sku,
        min_stock_level,
        stock (
          id,
          quantity,
          warehouse_id,
          last_updated,
          warehouses (name)
        )
      `)
      .order('name')

    if (productsError) {
      console.error('❌ Error fetching products:', productsError)
      return
    }

    console.log(`📦 Total products: ${products.length}\n`)

    // Analyze each product
    products.forEach(product => {
      console.log(`\n📌 Product: ${product.name} (SKU: ${product.sku || 'N/A'})`)
      console.log(`   Min Stock Level: ${product.min_stock_level}`)

      if (!product.stock || product.stock.length === 0) {
        console.log('   ⚠️  No stock records')
        return
      }

      console.log(`   Stock Records: ${product.stock.length}`)

      // Check for duplicates by warehouse
      const byWarehouse = new Map()
      product.stock.forEach(s => {
        const whId = s.warehouse_id || 'null'
        if (!byWarehouse.has(whId)) {
          byWarehouse.set(whId, [])
        }
        byWarehouse.get(whId).push(s)
      })

      // Display stock by warehouse
      byWarehouse.forEach((records, whId) => {
        const whName = records[0].warehouses?.name || 'Unknown Warehouse'

        if (records.length > 1) {
          console.log(`   🔴 DUPLICATE in ${whName}: ${records.length} records`)
          records.forEach((r, idx) => {
            console.log(`      [${idx + 1}] Qty: ${r.quantity}, Updated: ${r.last_updated}`)
          })
        } else {
          console.log(`   ✅ ${whName}: ${records[0].quantity}`)
        }
      })

      // Calculate total with old method (sum all)
      const oldTotal = product.stock.reduce((sum, s) => sum + Number(s.quantity || 0), 0)

      // Calculate total with new method (unique warehouses)
      const uniqueByWarehouse = new Map()
      product.stock.forEach(s => {
        const whId = s.warehouse_id || 'default'
        if (!uniqueByWarehouse.has(whId)) {
          uniqueByWarehouse.set(whId, Number(s.quantity || 0))
        }
      })
      const newTotal = Array.from(uniqueByWarehouse.values()).reduce((sum, qty) => sum + qty, 0)

      console.log(`   📊 Total (old method): ${oldTotal}`)
      console.log(`   📊 Total (new method): ${newTotal}`)

      if (oldTotal !== newTotal) {
        console.log(`   ⚠️  DISCREPANCY: ${oldTotal - newTotal} difference!`)
      }
    })

    // Get stock movements for context
    const { data: movements } = await supabase
      .from('stock_movements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log(`\n\n📋 Recent Stock Movements (last 10):`)
    movements?.forEach(m => {
      console.log(`   ${m.movement_type}: ${m.quantity} @ ${new Date(m.created_at).toLocaleString('tr-TR')}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkStockData()
  .then(() => {
    console.log('\n✅ Check completed!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Failed:', error)
    process.exit(1)
  })
