DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Contact' AND column_name = 'type'
  ) THEN
    ALTER TABLE "Contact" ALTER COLUMN "type" SET DEFAULT 'PURCHASER';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Contact' AND column_name = 'propertyTitle'
  ) THEN
    ALTER TABLE "Contact" ALTER COLUMN "propertyTitle" SET DEFAULT '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Contact' AND column_name = 'propertyAddress'
  ) THEN
    ALTER TABLE "Contact" ALTER COLUMN "propertyAddress" SET DEFAULT '';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Contact' AND column_name = 'city'
  ) THEN
    ALTER TABLE "Contact" ALTER COLUMN "city" DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Contact' AND column_name = 'postcode'
  ) THEN
    ALTER TABLE "Contact" ALTER COLUMN "postcode" DROP NOT NULL;
  END IF;
END $$;
