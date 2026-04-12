import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { planets, systemConfig } from '@/lib/schema';
import { sql } from 'drizzle-orm';

/**
 * 迁移星球时长配置
 * 1. 给planets表添加expire_at字段
 * 2. 将所有已存在的星球设置为永久（expire_at = null, duration_days = 0）
 * 3. 初始化系统配置
 */
export async function GET() {
  try {
    // 1. 添加expire_at字段（如果不存在）
    try {
      await db.execute(sql`
        ALTER TABLE planets ADD COLUMN IF NOT EXISTS expire_at TIMESTAMP NULL
      `);
    } catch (error) {
      console.log('expire_at column may already exist');
    }

    // 2. 添加duration_days字段（如果不存在）
    try {
      await db.execute(sql`
        ALTER TABLE planets ADD COLUMN IF NOT EXISTS duration_days INT DEFAULT 365
      `);
    } catch (error) {
      console.log('duration_days column may already exist');
    }

    // 2.5 将所有已存在的星球设置为永久（duration_days = 0表示永久）
    try {
      await db.execute(sql`
        UPDATE planets SET duration_days = 0 WHERE expire_at IS NULL
      `);
    } catch (error) {
      console.log('Update planets error:', error);
    }

    // 3. 创建system_config表（如果不存在）
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        config_key VARCHAR(100) NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        description VARCHAR(255),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_config_key (config_key)
      )
    `);

    // 4. 初始化星球创建价格配置
    const defaultConfigs = [
      { key: 'planet_price_7days', value: '0', description: '7天星球创建价格（U）' },
      { key: 'planet_price_1year', value: '1999', description: '1年星球创建价格（U）' },
      { key: 'planet_price_3years', value: '2999', description: '3年星球创建价格（U）' },
      { key: 'planet_price_permanent', value: '4999', description: '永久星球创建价格（U）' },
      { key: 'planet_creation_threshold', value: '2000', description: '创建星球所需最低 U' },
      { key: 'recharge_enabled', value: 'true', description: '是否启用充值' },
      { key: 'default_ticket_price', value: '100', description: '默认门票价格' },
      { key: 'max_publishers', value: '3', description: '最大发布者数量' },
    ];

    for (const config of defaultConfigs) {
      try {
        // 先检查是否存在
        const [existing] = await db
          .select()
          .from(systemConfig)
          .where(sql`config_key = ${config.key}`)
          .limit(1);

        if (!existing) {
          await db.insert(systemConfig).values({
            configKey: config.key,
            configValue: config.value,
            description: config.description,
          });
        }
      } catch (error) {
        console.log(`Config ${config.key} may already exist`);
      }
    }

    return NextResponse.json({
      success: true,
      message: '迁移完成：已添加expire_at字段，所有已存在星球设置为永久，系统配置已初始化'
    });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
