-- DELETE ALL EXISTING OPEC DATA FOR 'internal' COMPANY
DELETE FROM opec_management WHERE company_id = 'internal';
DELETE FROM opec_devices WHERE company_id = 'internal';

-- INSERT NEW DEVICES
INSERT INTO opec_devices (asset_code, phone_number, brand, model, company_id) VALUES
('Opec M001', '(11) 97003-4577', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M002', '(11) 97028-1432', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M003', '(11) 94356-3474', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M004', '(11) 97014-2329', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M005', '(11) 97041-3380', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M006', '(11) 92434-5521', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M007', '(11) 98322-0196', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M008', '(11) 97021-4322', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M009', '(11) 97028-6381', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M010', '(11) 97223-5334', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M011', '(11) 99344-4289', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M012', '(11) 97028-7965', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M013', '(11) 98334-1244', 'MOTOROLA', 'MotoG35', 'internal'),
('Opec M015', '(11) 99917-4183', 'MOTOROLA', 'MotoG35', 'internal')
ON CONFLICT (asset_code) DO UPDATE SET 
    phone_number = EXCLUDED.phone_number,
    company_id = EXCLUDED.company_id;

-- UPSERT EMPLOYEE INVITES (TO ENSURE THEY EXIST AND WE CAN LINK THEM)
-- Using a temporary table or multiple subqueries to avoid complex ID management
-- We'll link by email or name in the next step.

-- Ensure we have a unique constraint on email for employee_invites to support ON CONFLICT
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employee_invites_email_key'
    ) THEN
        ALTER TABLE employee_invites ADD CONSTRAINT employee_invites_email_key UNIQUE (email);
    END IF;
END $$;

INSERT INTO employee_invites (name, email, role, company_id, company_name, shift) VALUES
('DANILO JOSE CAETANO', 'motomanu001@gmail.com', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('GABRIEL ALVES DOS SANTOS', 'motomanu2001@gmail.com', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('RONALDO DE SOUZA OLIVEIRA', 'ronaldo.oliveira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('JOAO PAULO DOS REIS AMARAL', 'joao.amaral@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('MARCELO LOPES DOS SANTOS', 'marcelo.santos@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('CARLOS EDUARDO MENDES PEREIRA', 'carlos.pereira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('CRISTIANO MARIO PAIVA', 'cristiano.paiva@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('JOSE XAVIER DOS SANTOS', 'jose.santos@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('PAULO MACIEL CORREIA DOS SANTOS', 'paulo.santos@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('MARCELL LOPES MACHADO', 'marcell.machado@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('JEFFERSON ARAUJO DA SILVA', 'jefferson.silva@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('KENEDI DE OLIVEIRA', 'kenedi.oliveira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('ADAUTO SANTOS BRITO', 'adauto.brito@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('RUBENS MARCIO CAMARGO JUNQUEIRA', 'rubens.junqueira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('NILTON APARECIDO RIBEIRO', 'nilton.ribeiro@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('FRANCIMILDO SIMPLICIO DE OLIVEIRA', 'francimildo.oliveira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('VALDIR JOSE DA SILVA', 'valdir.silva@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('MARCONDES DE JESUS', 'marcondes.jesus@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('WESLEY OLIVEIRA', 'wesley.oliveira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('GUILHERME RODRIGUES TEIXEIRA', 'guilherme.teixeira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('EDISON JOSE DA SILVA', 'edison.silva@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('LEANDRO DE OLIVEIRA MOURA', 'leandro.moura@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('KLAUBER SILVA SANTANA BARRETO', 'klauber.barreto@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('VALMIR ROSA DE FREITAS', 'valmir.freitas@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('VICENTE HERRERA DE LIMA', 'vicente.lima@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('JORGE ANTONIO MOTA', 'jorge.mota@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('LUCIANO DE OLIVEIRA BOTERO', 'luciano.botero@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('WILLIAN SANTANA', 'motomanu3015@gmail.com', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('CARLOS EDUARDO MEIRELES', 'motomanu3115@gmail.com', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('GABRIEL NUNES', 'motomanu3215@gmail.com', 'TECNICO', 'internal', 'Eletromidia', 'DIURNO'),
('JOSÉ CARLOS DOS SANTOS SILVA', 'jose.silva@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('MARCOS VINICIUS AUGUSTO FREITAS', 'marcos.freitas@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('ABIBE LIMA PACHECO', 'abibe.pacheco@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('EDIVALDO JOSE DE SOUZA', 'edivaldo.souza@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('OSNI PINHEIRO SOARES', 'osni.soares@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('ARLEY VERA DE SOUSA', 'arley.sousa@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('GLAUBER DOS SANTOS OLIVEIRA', 'glauber.oliveira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('LEANDRO AUGUSTO LOURENCO MACHADO', 'leandro.machado@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('ADEMAR DE LOPES DE MOURA', 'ademar.moura@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('ROBERT PATRIK RODRIGUES', 'robert.rodrigues@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('SAMPAIO SILVA DE JESUS DIAS', 'sampaio.dias@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('RERETI PIRES DE MELO', 'rereti.melo@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('LUCIO ANTONIO DA SILVA', 'lucio.silva@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('RONALDO BARRETO DA SILVA LIMA', 'ronaldo.lima@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('MARCIO SILVA SANTOS', 'marcio.santos@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('JAIR AMBROSIO DE LIMA PEREIRA', 'jair.pereira@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('RICARDO MEDEIROS', 'ricardo.medeiros@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('MARCOS PAULO GONCALVES MENDES', 'marcos.mendes@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('LUCENE COSTA DE BRITO', 'lucene.brito@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('CLEBER JUNIOR JUSTINO', 'cleber.justino@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('RAMON RODRIGUESS SILVA', 'ramon.silva@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO'),
('LUCAS MATEUS DOS REIS - NOANTO', 'lucas.mateus@eletromidia.com.br', 'TECNICO', 'internal', 'Eletromidia', 'NOTURNO')
ON CONFLICT (email) DO NOTHING;

-- CREATE ASSIGNMENTS IN opec_management
-- We'll look up by name/email from both profiles AND employee_invites to be safe

INSERT INTO opec_management (opec_name, employee_id, company_id)
SELECT sub.opec, u.id, 'internal'
FROM (
    -- Group your manually transcribed data here
    SELECT 'Opec M001' as opec, 'DANILO JOSE CAETANO' as name UNION ALL
    SELECT 'Opec M001', 'GABRIEL ALVES DOS SANTOS' UNION ALL
    SELECT 'Opec M001', 'JOSÉ CARLOS DOS SANTOS SILVA' UNION ALL
    SELECT 'Opec M001', 'MARCOS VINICIUS AUGUSTO FREITAS' UNION ALL
    SELECT 'Opec M002', 'RONALDO DE SOUZA OLIVEIRA' UNION ALL
    SELECT 'Opec M002', 'JOAO PAULO DOS REIS AMARAL' UNION ALL
    SELECT 'Opec M002', 'ABIBE LIMA PACHECO' UNION ALL
    SELECT 'Opec M002', 'EDIVALDO JOSE DE SOUZA' UNION ALL
    SELECT 'Opec M003', 'MARCELO LOPES DOS SANTOS' UNION ALL
    SELECT 'Opec M003', 'CARLOS EDUARDO MENDES PEREIRA' UNION ALL
    SELECT 'Opec M003', 'OSNI PINHEIRO SOARES' UNION ALL
    SELECT 'Opec M003', 'RESIDENTE LIDER AUXILIAR' UNION ALL
    SELECT 'Opec M004', 'CRISTIANO MARIO PAIVA' UNION ALL
    SELECT 'Opec M004', 'JOSE XAVIER DOS SANTOS' UNION ALL
    SELECT 'Opec M004', 'ARLEY VERA DE SOUSA' UNION ALL
    SELECT 'Opec M004', 'GLAUBER DOS SANTOS OLIVEIRA' UNION ALL
    SELECT 'Opec M005', 'PAULO MACIEL CORREIA DOS SANTOS' UNION ALL
    SELECT 'Opec M005', 'MARCELL LOPES MACHADO' UNION ALL
    SELECT 'Opec M005', 'LEANDRO AUGUSTO LOURENCO MACHADO' UNION ALL
    SELECT 'Opec M005', 'ADEMAR DE LOPES DE MOURA' UNION ALL
    SELECT 'Opec M006', 'JEFFERSON ARAUJO DA SILVA' UNION ALL
    SELECT 'Opec M006', 'KENEDI DE OLIVEIRA' UNION ALL
    SELECT 'Opec M006', 'ROBERT PATRIK RODRIGUES' UNION ALL
    SELECT 'Opec M006', 'SAMPAIO SILVA DE JESUS DIAS' UNION ALL
    SELECT 'Opec M007', 'ADAUTO SANTOS BRITO' UNION ALL
    SELECT 'Opec M007', 'RUBENS MARCIO CAMARGO JUNQUEIRA' UNION ALL
    SELECT 'Opec M008', 'NILTON APARECIDO RIBEIRO' UNION ALL
    SELECT 'Opec M008', 'FRANCIMILDO SIMPLICIO DE OLIVEIRA' UNION ALL
    SELECT 'Opec M008', 'RERETI PIRES DE MELO' UNION ALL
    SELECT 'Opec M008', 'LUCIO ANTONIO DA SILVA' UNION ALL
    SELECT 'Opec M009', 'VALDIR JOSE DA SILVA' UNION ALL
    SELECT 'Opec M009', 'MARCONDES DE JESUS' UNION ALL
    SELECT 'Opec M009', 'RONALDO BARRETO DA SILVA LIMA' UNION ALL
    SELECT 'Opec M009', 'MARCIO SILVA SANTOS' UNION ALL
    SELECT 'Opec M009', 'JAIR AMBROSIO DE LIMA PEREIRA' UNION ALL
    SELECT 'Opec M010', 'WESLEY OLIVEIRA' UNION ALL
    SELECT 'Opec M010', 'GUILHERME RODRIGUES TEIXEIRA' UNION ALL
    SELECT 'Opec M011', 'EDISON JOSE DA SILVA' UNION ALL
    SELECT 'Opec M011', 'LEANDRO DE OLIVEIRA MOURA' UNION ALL
    SELECT 'Opec M011', 'RICARDO MEDEIROS' UNION ALL
    SELECT 'Opec M011', 'MARCOS PAULO GONCALVES MENDES' UNION ALL
    SELECT 'Opec M012', 'KLAUBER SILVA SANTANA BARRETO' UNION ALL
    SELECT 'Opec M012', 'VALMIR ROSA DE FREITAS' UNION ALL
    SELECT 'Opec M013', 'VICENTE HERRERA DE LIMA' UNION ALL
    SELECT 'Opec M013', 'JORGE ANTONIO MOTA' UNION ALL
    SELECT 'Opec M013', 'LUCIANO DE OLIVEIRA BOTERO' UNION ALL
    SELECT 'Opec M013', 'LUCENE COSTA DE BRITO' UNION ALL
    SELECT 'Opec M013', 'CLEBER JUNIOR JUSTINO' UNION ALL
    SELECT 'Opec M015', 'WILLIAN SANTANA' UNION ALL
    SELECT 'Opec M015', 'CARLOS EDUARDO MEIRELES' UNION ALL
    SELECT 'Opec M015', 'GABRIEL NUNES' UNION ALL
    SELECT 'Opec M015', 'RAMON RODRIGUESS SILVA' UNION ALL
    SELECT 'Opec M015', 'LUCAS MATEUS DOS REIS - NOANTO'
) sub
JOIN (
    -- Combine profiles and invites to find the ID
    SELECT id, name FROM profiles
    UNION ALL
    SELECT id, name FROM employee_invites
) u ON u.name = sub.name;
