"""
נתוני דמו — שישה פרופילי לקוח ריאליסטיים המכסים את כל שלבי החיים.

פרופילי לקוחות:
  1. דוד כהן, 38    — אמצע קריירה, תיק מאוזן, משכנתה + הלוואת רכב
  2. מאיה לוי, 28   — מקצוענית הייטק צעירה, צמיחה אגרסיבית, פגם קריטי בכרית ביטחון
  3. רות שפירו, 55  — רופאה לפני פרישה, פנסיה חזקה, קרן ישנה עם דמי ניהול גבוהים
  4. אורן מזרחי, 44 — בעל עסק, סיכון גבוה מאוד, מבנה חוב מורכב
  5. נועה בן-דוד, 32 — מורה נשואה לאחרונה, בונה את שלוש הטבעות מאפס
  6. יוסף כץ, 63    — אדריכל בפנסיה, שלב משיכות, הכנסת פנסיה, עודף טבעת ביטחון

התפלגות טבעות:
  דוד  → עתיד 55% / ביטחון 11% / צמיחה 34%   — מאוזן, פגם קל בביטחון
  מאיה  → עתיד 27% / ביטחון  8% / צמיחה 65%  — כבד בצמיחה, ביטחון קריטי
  רות   → עתיד 71% / ביטחון 21% / צמיחה  8%  — כבד בעתיד, לפני פרישה
  אורן  → עתיד 44% / ביטחון 14% / צמיחה 42%  — ריכוז סיכון בצמיחה
  נועה  → עתיד 45% / ביטחון 28% / צמיחה 27%  — הגיוני אך קטן; ביטחון ממומן חסר
  יוסף  → עתיד 30% / ביטחון 55% / צמיחה 15%  — גמלאי: מצב שמירת הון
"""

from __future__ import annotations

from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from models import (
    Asset, AssetType, Client, Goal, GoalStatus, GoalType,
    InvestmentThesis, Liability, LiabilityType, LiquidityLevel,
    RingType, RiskLevel,
)


def seed(db: Session) -> list[dict]:
    """
    מאכלס את בסיס הנתונים בלקוחות דמו.
    כל לקוח מדולג אם כבר קיים (אידמפוטנטי).
    מחזיר רשימת {message, client_id} לכל לקוח שנוצר.
    """
    results: list[dict] = []

    results += _seed_david_cohen(db)
    results += _seed_maya_levi(db)
    results += _seed_ruth_shapiro(db)
    results += _seed_oren_mizrahi(db)
    results += _seed_noa_ben_david(db)
    results += _seed_yosef_katz(db)

    if not results:
        first = db.query(Client).first()
        return [{"message": "כל לקוחות הדמו כבר קיימים", "client_id": first.id if first else 0}]

    return results


# ── דוד כהן — מקצוען אמצע קריירה ────────────────────────────────────────────

def _seed_david_cohen(db: Session) -> list[dict]:
    if db.query(Client).filter(Client.name == "David Cohen").first():
        return []

    c = Client(
        name="David Cohen", age=38,
        monthly_income=25_000, monthly_expenses=14_000,
        risk_tolerance=RiskLevel.MEDIUM, retirement_age=67, is_demo=True,
    )
    db.add(c); db.flush()

    _add_assets(db, c.id, [
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.PENSION_FUND,
             name="קרן פנסיה — מנורה", provider="מנורה מבטחים",
             balance=420_000, monthly_deposit=2_100,
             management_fees=0.70, historical_return=5.8,
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.ILLIQUID),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.STUDY_FUND,
             name="קרן השתלמות — כלל", provider="כלל ביטוח",
             balance=185_000, monthly_deposit=1_500,
             management_fees=0.50, historical_return=7.2,
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.MEDIUM_TERM),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.IRA,
             name="קופת גמל להשקעה — מגדל", provider="מגדל",
             balance=95_000, monthly_deposit=800,
             management_fees=1.20, historical_return=6.1,
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.ILLIQUID),
        dict(ring=RingType.SECURITY, asset_type=AssetType.MONEY_MARKET,
             name="קרן כספית — בנק דיסקונט", provider="בנק דיסקונט",
             balance=75_000, monthly_deposit=500,
             management_fees=0.10, historical_return=2.8,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.SECURITY, asset_type=AssetType.GOVERNMENT_BOND,
             name="תעודת סל אג\"ח ממשלתי", provider="iShares",
             balance=48_000, monthly_deposit=0,
             management_fees=0.07, historical_return=3.1,
             risk_level=RiskLevel.LOW, liquidity_level=LiquidityLevel.SHORT_TERM),
        dict(ring=RingType.GROWTH, asset_type=AssetType.ETF,
             name="תעודת סל S&P 500 (SPDR)", provider="State Street",
             balance=210_000, monthly_deposit=1_000,
             management_fees=0.09, historical_return=10.5,
             risk_level=RiskLevel.HIGH, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.GROWTH, asset_type=AssetType.STOCK,
             name="תיק מניות טכנולוגיה", provider="אינטראקטיב ברוקרס",
             balance=88_000, monthly_deposit=500,
             management_fees=0.0, historical_return=12.3,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.GROWTH, asset_type=AssetType.CRYPTO,
             name="ביטקוין ואת'ריום", provider="קוינבייס",
             balance=35_000, monthly_deposit=200,
             management_fees=0.50, historical_return=22.0,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.IMMEDIATE),
    ])

    _add_liabilities(db, c.id, [
        dict(liability_type=LiabilityType.MORTGAGE,
             name="משכנתה על הדירה", lender="בנק הפועלים",
             original_amount=1_200_000, remaining_balance=950_000,
             interest_rate=3.5, monthly_payment=5_200, remaining_months=252),
        dict(liability_type=LiabilityType.LOAN,
             name="הלוואת רכב", lender="בנק לאומי",
             original_amount=120_000, remaining_balance=68_000,
             interest_rate=5.2, monthly_payment=2_100, remaining_months=36),
    ])

    db.add(InvestmentThesis(
        client_id=c.id, title="מחזור-על של AI ומוליכים למחצה",
        macro_environment="בנקים מרכזיים פונים להורדות ריבית; אימוץ AI מניע הוצאות הון ארגוניות",
        sectors="טכנולוגיה, מוליכים למחצה, תשתיות ענן",
        advantages="צמיחת ביקוש מבנית, חסמי כניסה גבוהים, כוח תמחור",
        risks="הערכות שווי גבוהות, סיכון גיאופוליטי סביב טייוואן, ביקורת רגולטורית",
        is_active=True,
    ))

    _add_goals(db, c.id, [
        dict(goal_type=GoalType.EMERGENCY_FUND,
             title="בניית כרית ביטחון לחצי שנה",
             description="הגדלת טבעת הביטחון לכיסוי 6 חודשי הוצאות",
             target_amount=84_000, current_amount=75_000,
             monthly_contribution=1_500, status=GoalStatus.ACTIVE,
             ring=RingType.SECURITY,
             target_date=datetime.now() + timedelta(days=60)),
        dict(goal_type=GoalType.DEBT_PAYOFF,
             title="פירעון מוקדם של הלוואת הרכב",
             description="סגירת הלוואת הרכב 12 חודשים לפני הזמן",
             target_amount=68_000, current_amount=52_000,
             monthly_contribution=2_100, status=GoalStatus.ACTIVE,
             target_date=datetime.now() + timedelta(days=365)),
        dict(goal_type=GoalType.RETIREMENT_TARGET,
             title="יעד פנסיה: ₪5M",
             description="בניית תיק של ₪5M עד גיל 67",
             target_amount=5_000_000, current_amount=1_156_000,
             monthly_contribution=5_800, status=GoalStatus.ACTIVE,
             ring=RingType.RETIREMENT),
    ])

    db.commit()
    return [{"message": "דוד כהן נוצר", "client_id": c.id}]


# ── מאיה לוי — מקצוענית הייטק צעירה ─────────────────────────────────────────

def _seed_maya_levi(db: Session) -> list[dict]:
    if db.query(Client).filter(Client.name == "Maya Levi").first():
        return []

    c = Client(
        name="Maya Levi", age=28,
        monthly_income=22_000, monthly_expenses=11_000,
        risk_tolerance=RiskLevel.HIGH, retirement_age=65, is_demo=True,
    )
    db.add(c); db.flush()

    _add_assets(db, c.id, [
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.PENSION_FUND,
             name="פנסיה — הראל, מסלול מניות", provider="הראל ביטוח",
             balance=62_000, monthly_deposit=1_200,
             management_fees=0.45, historical_return=8.1,
             risk_level=RiskLevel.HIGH, liquidity_level=LiquidityLevel.ILLIQUID),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.STUDY_FUND,
             name="קרן השתלמות — פניקס", provider="הפניקס",
             balance=38_000, monthly_deposit=900,
             management_fees=0.40, historical_return=7.8,
             risk_level=RiskLevel.HIGH, liquidity_level=LiquidityLevel.MEDIUM_TERM),
        dict(ring=RingType.SECURITY, asset_type=AssetType.MONEY_MARKET,
             name="קרן כספית — בנק לאומי", provider="בנק לאומי",
             balance=22_000, monthly_deposit=1_000,
             management_fees=0.10, historical_return=2.5,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.GROWTH, asset_type=AssetType.ETF,
             name="תעודת סל נאסד\"ק 100 (QQQ)", provider="אינבסקו",
             balance=95_000, monthly_deposit=2_000,
             management_fees=0.20, historical_return=14.2,
             risk_level=RiskLevel.HIGH, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.GROWTH, asset_type=AssetType.STOCK,
             name="תיק RSU — סטארטאפ", provider="פידליטי",
             balance=145_000, monthly_deposit=0,
             management_fees=0.0, historical_return=18.5,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.SHORT_TERM),
        dict(ring=RingType.GROWTH, asset_type=AssetType.CRYPTO,
             name="תיק DeFi ואלטקוינים", provider="בינאנס",
             balance=28_000, monthly_deposit=500,
             management_fees=0.0, historical_return=35.0,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.IMMEDIATE),
    ])

    # מאיה שוכרת — אין התחייבויות

    _add_goals(db, c.id, [
        dict(goal_type=GoalType.EMERGENCY_FUND,
             title="כרית ביטחון לחצי שנה",
             description="קריטי — כרגע מכוסים רק 2 חודשים. יעד: ₪66K",
             target_amount=66_000, current_amount=22_000,
             monthly_contribution=2_000, status=GoalStatus.ACTIVE,
             ring=RingType.SECURITY,
             target_date=datetime.now() + timedelta(days=730)),
        dict(goal_type=GoalType.HOME_PURCHASE,
             title="מקדמה לדירה בתל אביב",
             description="חיסכון ₪400K למקדמה של 20% על דירה של ₪2M",
             target_amount=400_000, current_amount=145_000,
             monthly_contribution=3_000, status=GoalStatus.ACTIVE,
             target_date=datetime.now() + timedelta(days=365 * 3)),
        dict(goal_type=GoalType.SAVINGS_TARGET,
             title="צמיחת תיק RSU ל-₪300K",
             description="החזקה וצמיחת מניות RSU ככל שיבשילו",
             target_amount=300_000, current_amount=145_000,
             monthly_contribution=0, status=GoalStatus.ACTIVE,
             ring=RingType.GROWTH),
    ])

    db.commit()
    return [{"message": "מאיה לוי נוצרה", "client_id": c.id}]


# ── רות שפירו — רופאה לפני פרישה ─────────────────────────────────────────────

def _seed_ruth_shapiro(db: Session) -> list[dict]:
    if db.query(Client).filter(Client.name == "Ruth Shapiro").first():
        return []

    c = Client(
        name="Ruth Shapiro", age=55,
        monthly_income=42_000, monthly_expenses=20_000,
        risk_tolerance=RiskLevel.LOW, retirement_age=67, is_demo=True,
    )
    db.add(c); db.flush()

    _add_assets(db, c.id, [
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.PENSION_FUND,
             name="פנסיית רופאים — מנורה", provider="מנורה מבטחים",
             balance=1_850_000, monthly_deposit=5_500,
             management_fees=0.40, historical_return=5.2,
             risk_level=RiskLevel.LOW, liquidity_level=LiquidityLevel.ILLIQUID),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.STUDY_FUND,
             name="קרן השתלמות — מגדל", provider="מגדל",
             balance=620_000, monthly_deposit=3_000,
             management_fees=0.35, historical_return=5.8,
             risk_level=RiskLevel.LOW, liquidity_level=LiquidityLevel.MEDIUM_TERM),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.PROVIDENT_FUND,
             name="קופת גמל ותיקה — כלל", provider="כלל ביטוח",
             balance=285_000, monthly_deposit=0,
             management_fees=1.85, historical_return=4.1,  # דמי ניהול גבוהים — הזדמנות ייעוץ
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.LONG_TERM),
        dict(ring=RingType.SECURITY, asset_type=AssetType.BANK_DEPOSIT,
             name="פיקדון קבוע — בנק הפועלים", provider="בנק הפועלים",
             balance=480_000, monthly_deposit=2_000,
             management_fees=0.0, historical_return=4.2,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.SHORT_TERM),
        dict(ring=RingType.SECURITY, asset_type=AssetType.GOVERNMENT_BOND,
             name="אג\"ח ממשלתי צמוד מדד (גליל)", provider="הבורסה לניירות ערך",
             balance=320_000, monthly_deposit=500,
             management_fees=0.05, historical_return=3.5,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.SHORT_TERM),
        dict(ring=RingType.SECURITY, asset_type=AssetType.LIQUID_ETF,
             name="תעודת סל אג\"ח קצר טווח", provider="בלאקרוק",
             balance=95_000, monthly_deposit=0,
             management_fees=0.12, historical_return=3.8,
             risk_level=RiskLevel.LOW, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.GROWTH, asset_type=AssetType.ETF,
             name="תעודת סל עולמי מגוון (MSCI World)", provider="ואנגארד",
             balance=180_000, monthly_deposit=1_000,
             management_fees=0.20, historical_return=8.4,
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.IMMEDIATE),
    ])

    _add_liabilities(db, c.id, [
        dict(liability_type=LiabilityType.MORTGAGE,
             name="משכנתה על הבית — שנים אחרונות", lender="בנק הפועלים",
             original_amount=1_500_000, remaining_balance=145_000,
             interest_rate=2.8, monthly_payment=4_200, remaining_months=38),
    ])

    _add_goals(db, c.id, [
        dict(goal_type=GoalType.RETIREMENT_TARGET,
             title="תיק פנסיה: ₪10M",
             description="הגעה ל-₪10M עד גיל 67 — עוד 12 שנה",
             target_amount=10_000_000, current_amount=3_830_000,
             monthly_contribution=12_000, status=GoalStatus.ACTIVE,
             ring=RingType.RETIREMENT),
        dict(goal_type=GoalType.SAVINGS_TARGET,
             title="העברת קופת גמל ותיקה לקרן עם דמי ניהול נמוכים",
             description="מעבר קופת גמל של ₪285K מכלל — חיסכון של כ-₪4,000 בשנה בדמי ניהול",
             target_amount=285_000, current_amount=0,
             monthly_contribution=0, status=GoalStatus.ACTIVE,
             ring=RingType.RETIREMENT),
        dict(goal_type=GoalType.CUSTOM,
             title="טיול עולמי בפרישה",
             description="תקציב טיולים של ₪120K לשנתיים הראשונות של הפרישה",
             target_amount=120_000, current_amount=48_000,
             monthly_contribution=2_000, status=GoalStatus.ACTIVE,
             target_date=datetime.now() + timedelta(days=365 * 12)),
    ])

    db.commit()
    return [{"message": "רות שפירו נוצרה", "client_id": c.id}]


# ── אורן מזרחי — בעל עסק ──────────────────────────────────────────────────────

def _seed_oren_mizrahi(db: Session) -> list[dict]:
    if db.query(Client).filter(Client.name == "Oren Mizrahi").first():
        return []

    c = Client(
        name="Oren Mizrahi", age=44,
        monthly_income=65_000, monthly_expenses=35_000,
        risk_tolerance=RiskLevel.VERY_HIGH, retirement_age=60, is_demo=True,
    )
    db.add(c); db.flush()

    _add_assets(db, c.id, [
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.PENSION_FUND,
             name="פנסיית מנהלים — פניקס", provider="הפניקס",
             balance=890_000, monthly_deposit=4_500,
             management_fees=0.55, historical_return=6.8,
             risk_level=RiskLevel.HIGH, liquidity_level=LiquidityLevel.ILLIQUID),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.HIGH_RISK_PROVIDENT,
             name="קופת גמל בסיכון גבוה — הראל", provider="הראל",
             balance=340_000, monthly_deposit=2_000,
             management_fees=0.60, historical_return=9.5,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.LONG_TERM),
        dict(ring=RingType.SECURITY, asset_type=AssetType.MONEY_MARKET,
             name="עו\"ש עסקי — בנק דיסקונט", provider="בנק דיסקונט",
             balance=180_000, monthly_deposit=0,
             management_fees=0.0, historical_return=1.8,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.SECURITY, asset_type=AssetType.BANK_DEPOSIT,
             name="פיקדון קבוע ל-12 חודשים", provider="בנק מזרחי",
             balance=250_000, monthly_deposit=1_000,
             management_fees=0.0, historical_return=4.5,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.SHORT_TERM),
        dict(ring=RingType.GROWTH, asset_type=AssetType.STOCK_PORTFOLIO,
             name="תיק מניות טכנולוגיה וביוטק", provider="אינטראקטיב ברוקרס",
             balance=780_000, monthly_deposit=5_000,
             management_fees=0.0, historical_return=16.2,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.GROWTH, asset_type=AssetType.ETF,
             name="תעודת סל S&P ממונף (SSO)", provider="פרושרס",
             balance=220_000, monthly_deposit=2_000,
             management_fees=0.89, historical_return=18.0,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.GROWTH, asset_type=AssetType.CRYPTO,
             name="רזרבת ביטקוין אסטרטגית", provider="ארנק פרטי (Ledger)",
             balance=310_000, monthly_deposit=1_000,
             management_fees=0.0, historical_return=28.0,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.IMMEDIATE),
        dict(ring=RingType.GROWTH, asset_type=AssetType.STOCK,
             name="השקעות בהון פרטי", provider="ישיר",
             balance=450_000, monthly_deposit=0,
             management_fees=2.0, historical_return=21.0,
             risk_level=RiskLevel.VERY_HIGH, liquidity_level=LiquidityLevel.ILLIQUID),
    ])

    _add_liabilities(db, c.id, [
        dict(liability_type=LiabilityType.MORTGAGE,
             name="משכנתה על דירת המגורים", lender="בנק הפועלים",
             original_amount=2_800_000, remaining_balance=2_100_000,
             interest_rate=4.1, monthly_payment=12_500, remaining_months=216),
        dict(liability_type=LiabilityType.LOAN,
             name="הלוואה לפיתוח העסק", lender="בנק לאומי",
             original_amount=800_000, remaining_balance=560_000,
             interest_rate=6.8, monthly_payment=9_200, remaining_months=72),
        dict(liability_type=LiabilityType.CREDIT_LINE,
             name="מסגרת אשראי עסקית", lender="בנק דיסקונט",
             original_amount=500_000, remaining_balance=380_000,
             interest_rate=8.5, monthly_payment=4_800, remaining_months=96),
    ])

    db.add(InvestmentThesis(
        client_id=c.id, title="נכסים ריאליים וכסף קשה בעשור האינפלציוני",
        macro_environment="אינפלציה מתמשכת, דה-גלובליזציה, מעבר אנרגטי מניע נכסים ריאליים",
        sectors="נדל\"ן, אנרגיה, סחורות, ביטקוין, תשתיות",
        advantages="גידור אינפלציה, היצע מוגבל, יצירת תזרים מזומנים",
        risks="רגישות לריבית, חוסר נזילות, מינוף מגביר את הסיכון",
        is_active=True,
    ))

    _add_goals(db, c.id, [
        dict(goal_type=GoalType.RETIREMENT_TARGET,
             title="פרישה מוקדמת בגיל 60 — ₪20M",
             description="יעד אגרסיבי של ₪20M בעוד 16 שנה לפרישה בגיל 60",
             target_amount=20_000_000, current_amount=3_420_000,
             monthly_contribution=15_500, status=GoalStatus.ACTIVE,
             ring=RingType.RETIREMENT),
        dict(goal_type=GoalType.DEBT_PAYOFF,
             title="סגירת מסגרת האשראי העסקית",
             description="פירעון מסגרת אשראי של ₪380K להפחתת ניקוז מזומנים חודשי",
             target_amount=380_000, current_amount=120_000,
             monthly_contribution=4_800, status=GoalStatus.ACTIVE,
             target_date=datetime.now() + timedelta(days=365 * 4)),
        dict(goal_type=GoalType.SAVINGS_TARGET,
             title="צמיחת רזרבת הביטקוין ל-₪500K",
             description="השקעה שוטפת בביטקוין — יעד ₪500K כרזרבה אסטרטגית",
             target_amount=500_000, current_amount=310_000,
             monthly_contribution=1_000, status=GoalStatus.ACTIVE,
             ring=RingType.GROWTH),
    ])

    db.commit()
    return [{"message": "אורן מזרחי נוצר", "client_id": c.id}]


# ── נועה בן-דוד — מורה נשואה, בונה מאפס ─────────────────────────────────────

def _seed_noa_ben_david(db: Session) -> list[dict]:
    if db.query(Client).filter(Client.name == "Noa Ben-David").first():
        return []

    c = Client(
        name="Noa Ben-David", age=32,
        monthly_income=14_500, monthly_expenses=9_000,
        risk_tolerance=RiskLevel.MEDIUM, retirement_age=67, is_demo=True,
    )
    db.add(c); db.flush()

    _add_assets(db, c.id, [
        # ── טבעת עתיד (≈45%) ─────────────────────────────────────────────────
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.PENSION_FUND,
             name="פנסיית מורים — מיטב", provider="מיטב",
             balance=78_000, monthly_deposit=900,
             management_fees=0.30, historical_return=5.5,
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.ILLIQUID,
             notes="מעסיק מפריש 6.5%, נועה מפרישה 6% מהשכר"),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.STUDY_FUND,
             name="קרן השתלמות — מור", provider="מור",
             balance=41_000, monthly_deposit=580,
             management_fees=0.25, historical_return=6.8,
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.MEDIUM_TERM,
             notes="פתוחה מהשנה הראשונה לעבודה; פטורה ממס אחרי 6 שנים"),

        # ── טבעת ביטחון (≈28%) — ממומנת חסר ────────────────────────────────
        dict(ring=RingType.SECURITY, asset_type=AssetType.MONEY_MARKET,
             name="חשבון חיסכון — בנק הפועלים", provider="בנק הפועלים",
             balance=31_500, monthly_deposit=1_200,
             management_fees=0.0, historical_return=3.2,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.IMMEDIATE,
             notes="כרית ביטחון — 3.5 חודשים, יעד 6 חודשים"),
        dict(ring=RingType.SECURITY, asset_type=AssetType.GOVERNMENT_BOND,
             name="תעודת סל אג\"ח ממשלתי קצר", provider="בלאקרוק iShares",
             balance=17_500, monthly_deposit=200,
             management_fees=0.07, historical_return=3.0,
             risk_level=RiskLevel.LOW, liquidity_level=LiquidityLevel.SHORT_TERM,
             notes="רשת ביטחון נזילה"),

        # ── טבעת צמיחה (≈27%) — רק מתחילה ──────────────────────────────────
        dict(ring=RingType.GROWTH, asset_type=AssetType.ETF,
             name="תעודת סל MSCI World (צוברת)", provider="ואנגארד",
             balance=28_000, monthly_deposit=600,
             management_fees=0.12, historical_return=9.8,
             risk_level=RiskLevel.HIGH, liquidity_level=LiquidityLevel.IMMEDIATE,
             notes="החלה לפני 18 חודשים; השקעה חודשית קבועה"),
        dict(ring=RingType.GROWTH, asset_type=AssetType.ETF,
             name="תעודת סל ת\"א 35 (תכלית)", provider="תכלית",
             balance=14_000, monthly_deposit=300,
             management_fees=0.15, historical_return=7.4,
             risk_level=RiskLevel.HIGH, liquidity_level=LiquidityLevel.IMMEDIATE,
             notes="חשיפה לשוק המניות הישראלי; נרכש בירידות 2023"),
    ])

    # אין התחייבויות — שוכרת, אין הלוואת רכב

    _add_goals(db, c.id, [
        dict(goal_type=GoalType.EMERGENCY_FUND,
             title="השלמת כרית ביטחון לחצי שנה",
             description=(
                 "כיסוי נוכחי: 3.5 חודשים (₪31,500). "
                 "נדרש עוד ₪22,500 להגעה ליעד ₪54,000."
             ),
             target_amount=54_000, current_amount=31_500,
             monthly_contribution=1_200, status=GoalStatus.ACTIVE,
             ring=RingType.SECURITY,
             target_date=datetime.now() + timedelta(days=545)),
        dict(goal_type=GoalType.HOME_PURCHASE,
             title="מקדמה לדירה ראשונה",
             description=(
                 "חיסכון ₪300K למקדמה של 20% על דירה של ₪1.5M "
                 "באזור גוש דן. יעד משותף לבני הזוג."
             ),
             target_amount=300_000, current_amount=59_000,
             monthly_contribution=3_000, status=GoalStatus.ACTIVE,
             target_date=datetime.now() + timedelta(days=365 * 4)),
        dict(goal_type=GoalType.RETIREMENT_TARGET,
             title="פנסיה של ₪3.5M עד גיל 67",
             description=(
                 "צבירה של ₪3.5M בפנסיה וקרן השתלמות עד גיל פרישה 67. "
                 "כרגע בכיוון הנכון בתרחיש ממוצע."
             ),
             target_amount=3_500_000, current_amount=119_000,
             monthly_contribution=1_480, status=GoalStatus.ACTIVE,
             ring=RingType.RETIREMENT),
        dict(goal_type=GoalType.EDUCATION_FUND,
             title="קרן חינוך לילדים",
             description="הקמת קרן חינוך של ₪200K לילדים עתידיים.",
             target_amount=200_000, current_amount=0,
             monthly_contribution=0, status=GoalStatus.ACTIVE,
             ring=RingType.GROWTH,
             target_date=datetime.now() + timedelta(days=365 * 18)),
    ])

    db.commit()
    return [{"message": "נועה בן-דוד נוצרה", "client_id": c.id}]


# ── יוסף כץ — אדריכל בפנסיה, שלב משיכות ─────────────────────────────────────

def _seed_yosef_katz(db: Session) -> list[dict]:
    if db.query(Client).filter(Client.name == "Yosef Katz").first():
        return []

    c = Client(
        name="Yosef Katz", age=63,
        monthly_income=20_500,   # ₪8,500 פנסיה + ₪12,000 משיכה מהתיק
        monthly_expenses=18_000,
        risk_tolerance=RiskLevel.LOW, retirement_age=63, is_demo=True,  # כבר בפנסיה
    )
    db.add(c); db.flush()

    _add_assets(db, c.id, [
        # ── טבעת עתיד (≈30%) — משיכה הדרגתית ───────────────────────────────
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.PENSION_FUND,
             name="פנסיה מקצועית — כלל", provider="כלל ביטוח",
             balance=920_000, monthly_deposit=0,
             management_fees=0.45, historical_return=4.8,
             risk_level=RiskLevel.LOW, liquidity_level=LiquidityLevel.ILLIQUID,
             notes="קצבה חודשית; מספקת ₪5,200 הכנסת פנסיה ברוטו"),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.PROVIDENT_FUND,
             name="קופת גמל ותיקה — מנורה", provider="מנורה מבטחים",
             balance=285_000, monthly_deposit=0,
             management_fees=1.70, historical_return=3.9,  # דמי ניהול גבוהים — עדיפות לניוד
             risk_level=RiskLevel.LOW, liquidity_level=LiquidityLevel.LONG_TERM,
             notes="קרן דור ישן משנות ה-90; דמי ניהול גבוהים, יש לנייד"),
        dict(ring=RingType.RETIREMENT, asset_type=AssetType.IRA,
             name="קופת גמל להשקעה — מגדל", provider="מגדל",
             balance=180_000, monthly_deposit=0,
             management_fees=0.80, historical_return=5.1,
             risk_level=RiskLevel.LOW, liquidity_level=LiquidityLevel.ILLIQUID,
             notes="משלים את הפנסיה; ניתן למשוך חלקית מגיל 60"),

        # ── טבעת ביטחון (≈55%) — שמירת הון ─────────────────────────────────
        dict(ring=RingType.SECURITY, asset_type=AssetType.BANK_DEPOSIT,
             name="סולם פיקדונות — בנק לאומי", provider="בנק לאומי",
             balance=680_000, monthly_deposit=0,
             management_fees=0.0, historical_return=4.6,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.SHORT_TERM,
             notes="3 פיקדונות של ₪227K המתחדשים כל 6, 12, 18 חודשים"),
        dict(ring=RingType.SECURITY, asset_type=AssetType.GOVERNMENT_BOND,
             name="אג\"ח ממשלתי צמוד מדד (גליל)", provider="הבורסה לניירות ערך",
             balance=420_000, monthly_deposit=0,
             management_fees=0.05, historical_return=3.4,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.SHORT_TERM,
             notes="הגנת אינפלציה — גידור הכנסה ראשי"),
        dict(ring=RingType.SECURITY, asset_type=AssetType.MONEY_MARKET,
             name="קרן כספית — בנק דיסקונט", provider="בנק דיסקונט",
             balance=95_000, monthly_deposit=0,
             management_fees=0.08, historical_return=2.9,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.IMMEDIATE,
             notes="מאגר מזומנים ל-12 חודשים"),
        dict(ring=RingType.SECURITY, asset_type=AssetType.LIQUID_ETF,
             name="תעודת סל אג\"ח קצר מועד", provider="בלאקרוק iShares",
             balance=110_000, monthly_deposit=0,
             management_fees=0.10, historical_return=3.2,
             risk_level=RiskLevel.VERY_LOW, liquidity_level=LiquidityLevel.IMMEDIATE,
             notes="תשואה עודפת על מזומן; נזילות T+1"),

        # ── טבעת צמיחה (≈15%) — גידור אריכות ימים ──────────────────────────
        dict(ring=RingType.GROWTH, asset_type=AssetType.ETF,
             name="תעודת סל דיבידנד עולמי (VIG)", provider="ואנגארד",
             balance=280_000, monthly_deposit=0,
             management_fees=0.06, historical_return=7.8,
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.IMMEDIATE,
             notes="הכנסת דיבידנד משלימה תזרים; תשואה ≈2.5% = ₪7K בשנה"),
        dict(ring=RingType.GROWTH, asset_type=AssetType.STOCK,
             name="מניות Blue Chip", provider="אינטראקטיב ברוקרס",
             balance=185_000, monthly_deposit=0,
             management_fees=0.0, historical_return=9.2,
             risk_level=RiskLevel.MEDIUM, liquidity_level=LiquidityLevel.IMMEDIATE,
             notes="מניות ערך איכותיות; נרכשו לפני הפרישה כהחזקה ארוכת טווח"),
    ])

    # אין התחייבויות — המשכנתה שולמה במלואה בגיל 61

    db.add(InvestmentThesis(
        client_id=c.id, title="שמירת הון והגנה מפני אינפלציה",
        macro_environment="גמלאי בסביבת אינפלציה גבוהה; תשואות ריאליות חיוביות בשולי",
        sectors="אג\"ח ממשלתי, מניות דיבידנד, פיקדונות קבועים, זהב",
        advantages="תנודתיות נמוכה, הכנסה צפויה, הגנת אינפלציה דרך אג\"ח צמוד מדד",
        risks="סיכון אריכות ימים — שמרני מדי לאופק של 30 שנה; קופת גמל ותיקה עם דמי ניהול גבוהים",
        is_active=True,
    ))

    _add_goals(db, c.id, [
        dict(goal_type=GoalType.RETIREMENT_TARGET,
             title="שמירה על ₪18K לחודש למשך 30 שנה",
             description=(
                 "שמירת רמת חיים (₪18K לחודש) עד גיל 93. "
                 "פנסיה מכסה ₪8,500; התיק צריך לייצר ₪9,500 לחודש נטו. "
                 "בקצב משיכה נוכחי, התיק מחזיק עד גיל ~87 — פגם אריכות ימים."
             ),
             target_amount=3_420_000,
             current_amount=3_175_000,
             monthly_contribution=0, status=GoalStatus.ACTIVE,
             ring=RingType.RETIREMENT),
        dict(goal_type=GoalType.SAVINGS_TARGET,
             title="ניוד קופת גמל ותיקה לקרן עם דמי ניהול נמוכים",
             description=(
                 "העברת קופת גמל ₪285K מנורה (דמי ניהול 1.7%) לקרן מודרנית ב-0.3%. "
                 "חיסכון ₪4,000 בשנה — מעל ₪80K בתוספת ריבית דריבית לאורך 20 שנה."
             ),
             target_amount=285_000, current_amount=0,
             monthly_contribution=0, status=GoalStatus.ACTIVE,
             ring=RingType.RETIREMENT),
        dict(goal_type=GoalType.CUSTOM,
             title="קרן ירושה לילדים",
             description=(
                 "השארת ירושה של ₪500K לשני ילדים בוגרים. "
                 "שמירת טבעת הצמיחה שלמה היא הכלי העיקרי."
             ),
             target_amount=500_000, current_amount=465_000,
             monthly_contribution=0, status=GoalStatus.ACTIVE,
             ring=RingType.GROWTH),
        dict(goal_type=GoalType.CUSTOM,
             title="תקציב טיולים לעשור",
             description="קרן טיולים של ₪240K (₪24K בשנה × 10 שנים) לשנות הפרישה.",
             target_amount=240_000, current_amount=95_000,
             monthly_contribution=0, status=GoalStatus.ACTIVE,
             target_date=datetime.now() + timedelta(days=365 * 10)),
    ])

    db.commit()
    return [{"message": "יוסף כץ נוצר", "client_id": c.id}]


# ── עזרי ────────────────────────────────────────────────────────────────────────

def _add_assets(db: Session, client_id: int, assets: list[dict]) -> None:
    for a in assets:
        db.add(Asset(client_id=client_id, **a))


def _add_liabilities(db: Session, client_id: int, liabilities: list[dict]) -> None:
    for l in liabilities:
        db.add(Liability(client_id=client_id, **l))


def _add_goals(db: Session, client_id: int, goals: list[dict]) -> None:
    for g in goals:
        db.add(Goal(client_id=client_id, **g))
