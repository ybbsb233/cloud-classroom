# 历史 SQL

此目录保存合并前的 SQL 快照及升级脚本，不是当前新库的安装顺序。

新库只执行上一级的 `init.sql`，需要演示学生和练习历史时再执行 `demo_history.sql`。不要将本目录中的脚本与统一初始化混用，也不要对已升级数据库逐个重复执行。

旧库仍可使用 `scripts/upgrade-teachers.ps1`、`upgrade-classes.ps1`、`upgrade-schedule.ps1` 和 `upgrade-attendance.ps1`；这些入口按原有升级规则读取本目录。旧题库生成工具的输出也保留在此目录，不覆盖当前统一初始化文件。
