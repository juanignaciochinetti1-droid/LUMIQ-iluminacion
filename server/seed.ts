// Seed inicial: productos, insumos, recetas y producción histórica enero 2026.
// Ejecutar con: npx tsx server/seed.ts (desde la raíz del proyecto)
// SQLite: la DB se crea automáticamente en ./data/gestion.db

import { eq, and } from 'drizzle-orm';
import { db, initializeTables } from './db';
import { insumos, productos, recetas, produccion } from '../drizzle/schema';

// ─── PRODUCTOS ───────────────────────────────────────────────────────────────

const PRODUCTS = [
  // Saturno 1 aro – Negro
  { code: 'PROD-001', nombre: 'Saturno 1 aro Ø100 Negro luz calida' },
  { code: 'PROD-002', nombre: 'Saturno 1 aro Ø100 Negro luz neutra' },
  { code: 'PROD-003', nombre: 'Saturno 1 aro Ø100 Negro luz fria' },
  { code: 'PROD-004', nombre: 'Saturno 1 aro Ø80 Negro luz calida' },
  { code: 'PROD-005', nombre: 'Saturno 1 aro Ø80 Negro luz neutra' },
  { code: 'PROD-006', nombre: 'Saturno 1 aro Ø80 Negro luz fria' },
  { code: 'PROD-007', nombre: 'Saturno 1 aro Ø70 Negro luz calida' },
  { code: 'PROD-008', nombre: 'Saturno 1 aro Ø70 Negro luz neutra' },
  { code: 'PROD-009', nombre: 'Saturno 1 aro Ø70 Negro luz fria' },
  { code: 'PROD-010', nombre: 'Saturno 1 aro Ø60 Negro luz calida' },
  { code: 'PROD-011', nombre: 'Saturno 1 aro Ø60 Negro luz neutra' },
  { code: 'PROD-012', nombre: 'Saturno 1 aro Ø60 Negro luz fria' },
  { code: 'PROD-013', nombre: 'Saturno 1 aro Ø45 Negro luz calida' },
  { code: 'PROD-014', nombre: 'Saturno 1 aro Ø45 Negro luz neutra' },
  { code: 'PROD-015', nombre: 'Saturno 1 aro Ø45 Negro luz fria' },
  { code: 'PROD-016', nombre: 'Saturno 1 aro Ø30 Negro luz calida' },
  { code: 'PROD-017', nombre: 'Saturno 1 aro Ø30 Negro luz neutra' },
  { code: 'PROD-018', nombre: 'Saturno 1 aro Ø30 Negro luz fria' },
  // Saturno 1 aro – Gris
  { code: 'PROD-019', nombre: 'Saturno 1 aro Ø100 Gris luz calida' },
  { code: 'PROD-020', nombre: 'Saturno 1 aro Ø100 Gris luz neutra' },
  { code: 'PROD-021', nombre: 'Saturno 1 aro Ø100 Gris luz fria' },
  { code: 'PROD-022', nombre: 'Saturno 1 aro Ø80 Gris luz calida' },
  { code: 'PROD-023', nombre: 'Saturno 1 aro Ø80 Gris luz neutra' },
  { code: 'PROD-024', nombre: 'Saturno 1 aro Ø80 Gris luz fria' },
  { code: 'PROD-025', nombre: 'Saturno 1 aro Ø70 Gris luz calida' },
  { code: 'PROD-026', nombre: 'Saturno 1 aro Ø70 Gris luz neutra' },
  { code: 'PROD-027', nombre: 'Saturno 1 aro Ø70 Gris luz fria' },
  { code: 'PROD-028', nombre: 'Saturno 1 aro Ø60 Gris luz calida' },
  { code: 'PROD-029', nombre: 'Saturno 1 aro Ø60 Gris luz neutra' },
  { code: 'PROD-030', nombre: 'Saturno 1 aro Ø60 Gris luz fria' },
  { code: 'PROD-031', nombre: 'Saturno 1 aro Ø45 Gris luz calida' },
  { code: 'PROD-032', nombre: 'Saturno 1 aro Ø45 Gris luz neutra' },
  { code: 'PROD-033', nombre: 'Saturno 1 aro Ø45 Gris luz fria' },
  { code: 'PROD-034', nombre: 'Saturno 1 aro Ø30 Gris luz calida' },
  { code: 'PROD-035', nombre: 'Saturno 1 aro Ø30 Gris luz neutra' },
  { code: 'PROD-036', nombre: 'Saturno 1 aro Ø30 Gris luz fria' },
  // Saturno 2 aros – Negro
  { code: 'PROD-037', nombre: 'Saturno 2 aros Ø100-80 Negro luz calida' },
  { code: 'PROD-038', nombre: 'Saturno 2 aros Ø100-80 Negro luz neutra' },
  { code: 'PROD-039', nombre: 'Saturno 2 aros Ø100-80 Negro luz fria' },
  { code: 'PROD-040', nombre: 'Saturno 2 aros Ø80-60 Negro luz calida' },
  { code: 'PROD-041', nombre: 'Saturno 2 aros Ø80-60 Negro luz neutra' },
  { code: 'PROD-042', nombre: 'Saturno 2 aros Ø80-60 Negro luz fria' },
  { code: 'PROD-043', nombre: 'Saturno 2 aros Ø60-45 Negro luz calida' },
  { code: 'PROD-044', nombre: 'Saturno 2 aros Ø60-45 Negro luz neutra' },
  { code: 'PROD-045', nombre: 'Saturno 2 aros Ø60-45 Negro luz fria' },
  // Saturno 2 aros – Gris
  { code: 'PROD-046', nombre: 'Saturno 2 aros Ø100-80 Gris luz calida' },
  { code: 'PROD-047', nombre: 'Saturno 2 aros Ø100-80 Gris luz neutra' },
  { code: 'PROD-048', nombre: 'Saturno 2 aros Ø100-80 Gris luz fria' },
  { code: 'PROD-049', nombre: 'Saturno 2 aros Ø80-60 Gris luz calida' },
  { code: 'PROD-050', nombre: 'Saturno 2 aros Ø80-60 Gris luz neutra' },
  { code: 'PROD-051', nombre: 'Saturno 2 aros Ø80-60 Gris luz fria' },
  { code: 'PROD-052', nombre: 'Saturno 2 aros Ø60-45 Gris luz calida' },
  { code: 'PROD-053', nombre: 'Saturno 2 aros Ø60-45 Gris luz neutra' },
  { code: 'PROD-054', nombre: 'Saturno 2 aros Ø60-45 Gris luz fria' },
  // Saturno 3 aros – Negro
  { code: 'PROD-055', nombre: 'Saturno 3 aros Ø100-80-60 Negro luz calida' },
  { code: 'PROD-056', nombre: 'Saturno 3 aros Ø100-80-60 Negro luz neutra' },
  { code: 'PROD-057', nombre: 'Saturno 3 aros Ø100-80-60 Negro luz fria' },
  { code: 'PROD-058', nombre: 'Saturno 3 aros Ø80-60-45 Negro luz calida' },
  { code: 'PROD-059', nombre: 'Saturno 3 aros Ø80-60-45 Negro luz neutra' },
  { code: 'PROD-060', nombre: 'Saturno 3 aros Ø80-60-45 Negro luz fria' },
  { code: 'PROD-061', nombre: 'Saturno 3 aros Ø60-45-30 Negro luz calida' },
  { code: 'PROD-062', nombre: 'Saturno 3 aros Ø60-45-30 Negro luz neutra' },
  { code: 'PROD-063', nombre: 'Saturno 3 aros Ø60-45-30 Negro luz fria' },
  // Saturno 3 aros – Gris
  { code: 'PROD-064', nombre: 'Saturno 3 aros Ø100-80-60 Gris luz calida' },
  { code: 'PROD-065', nombre: 'Saturno 3 aros Ø100-80-60 Gris luz neutra' },
  { code: 'PROD-066', nombre: 'Saturno 3 aros Ø100-80-60 Gris luz fria' },
  { code: 'PROD-067', nombre: 'Saturno 3 aros Ø80-60-45 Gris luz calida' },
  { code: 'PROD-068', nombre: 'Saturno 3 aros Ø80-60-45 Gris luz neutra' },
  { code: 'PROD-069', nombre: 'Saturno 3 aros Ø80-60-45 Gris luz fria' },
  { code: 'PROD-070', nombre: 'Saturno 3 aros Ø60-45-30 Gris luz calida' },
  { code: 'PROD-071', nombre: 'Saturno 3 aros Ø60-45-30 Gris luz neutra' },
  { code: 'PROD-072', nombre: 'Saturno 3 aros Ø60-45-30 Gris luz fria' },
  // Saturno 4 aros – Negro
  { code: 'PROD-073', nombre: 'Saturno 4 aros Ø100-80-70-60 Negro luz calida' },
  { code: 'PROD-074', nombre: 'Saturno 4 aros Ø100-80-70-60 Negro luz neutra' },
  { code: 'PROD-075', nombre: 'Saturno 4 aros Ø100-80-70-60 Negro luz fria' },
  { code: 'PROD-076', nombre: 'Saturno 4 aros Ø80-70-60-45 Negro luz calida' },
  { code: 'PROD-077', nombre: 'Saturno 4 aros Ø80-70-60-45 Negro luz neutra' },
  { code: 'PROD-078', nombre: 'Saturno 4 aros Ø80-70-60-45 Negro luz fria' },
  { code: 'PROD-079', nombre: 'Saturno 4 aros Ø70-60-45-30 Negro luz calida' },
  { code: 'PROD-080', nombre: 'Saturno 4 aros Ø70-60-45-30 Negro luz neutra' },
  { code: 'PROD-081', nombre: 'Saturno 4 aros Ø70-60-45-30 Negro luz fria' },
  // Saturno 4 aros – Gris
  { code: 'PROD-082', nombre: 'Saturno 4 aros Ø100-80-70-60 Gris luz calida' },
  { code: 'PROD-083', nombre: 'Saturno 4 aros Ø100-80-70-60 Gris luz neutra' },
  { code: 'PROD-084', nombre: 'Saturno 4 aros Ø100-80-70-60 Gris luz fria' },
  { code: 'PROD-085', nombre: 'Saturno 4 aros Ø80-70-60-45 Gris luz calida' },
  { code: 'PROD-086', nombre: 'Saturno 4 aros Ø80-70-60-45 Gris luz neutra' },
  { code: 'PROD-087', nombre: 'Saturno 4 aros Ø80-70-60-45 Gris luz fria' },
  { code: 'PROD-088', nombre: 'Saturno 4 aros Ø70-60-45-30 Gris luz calida' },
  { code: 'PROD-089', nombre: 'Saturno 4 aros Ø70-60-45-30 Gris luz neutra' },
  { code: 'PROD-090', nombre: 'Saturno 4 aros Ø70-60-45-30 Gris luz fria' },
  // Saturno 5 aros – Negro
  { code: 'PROD-091', nombre: 'Saturno 5 aros Ø100-80-70-60-45 Negro luz calida' },
  { code: 'PROD-092', nombre: 'Saturno 5 aros Ø100-80-70-60-45 Negro luz neutra' },
  { code: 'PROD-093', nombre: 'Saturno 5 aros Ø100-80-70-60-45 Negro luz fria' },
  // Saturno 5 aros – Gris
  { code: 'PROD-094', nombre: 'Saturno 5 aros Ø100-80-70-60-45 Gris luz calida' },
  { code: 'PROD-095', nombre: 'Saturno 5 aros Ø100-80-70-60-45 Gris luz neutra' },
  { code: 'PROD-096', nombre: 'Saturno 5 aros Ø100-80-70-60-45 Gris luz fria' },
  // Saturno 5 aros – Negro (combinación 2)
  { code: 'PROD-097', nombre: 'Saturno 5 aros Ø80-70-60-45-30 Negro luz calida' },
  { code: 'PROD-098', nombre: 'Saturno 5 aros Ø80-70-60-45-30 Negro luz neutra' },
  { code: 'PROD-099', nombre: 'Saturno 5 aros Ø80-70-60-45-30 Negro luz fria' },
  // Saturno 5 aros – Gris (combinación 2)
  { code: 'PROD-100', nombre: 'Saturno 5 aros Ø80-70-60-45-30 Gris luz calida' },
  { code: 'PROD-101', nombre: 'Saturno 5 aros Ø80-70-60-45-30 Gris luz neutra' },
  { code: 'PROD-102', nombre: 'Saturno 5 aros Ø80-70-60-45-30 Gris luz fria' },
  // Saturno 6 aros – Negro
  { code: 'PROD-103', nombre: 'Saturno 6 aros Ø100-80-70-60-45-30 Negro luz calida' },
  { code: 'PROD-104', nombre: 'Saturno 6 aros Ø100-80-70-60-45-30 Negro luz neutra' },
  { code: 'PROD-105', nombre: 'Saturno 6 aros Ø100-80-70-60-45-30 Negro luz fria' },
  // Saturno 6 aros – Gris
  { code: 'PROD-106', nombre: 'Saturno 6 aros Ø100-80-70-60-45-30 Gris luz calida' },
  { code: 'PROD-107', nombre: 'Saturno 6 aros Ø100-80-70-60-45-30 Gris luz neutra' },
  { code: 'PROD-108', nombre: 'Saturno 6 aros Ø100-80-70-60-45-30 Gris luz fria' },
  // Colgante Eternity
  { code: 'PROD-109', nombre: 'Colgante Eternity Negro luz calida' },
  { code: 'PROD-110', nombre: 'Colgante Eternity Negro luz neutra' },
  { code: 'PROD-111', nombre: 'Colgante Eternity Negro luz fria' },
  { code: 'PROD-112', nombre: 'Colgante Eternity Gris luz calida' },
  { code: 'PROD-113', nombre: 'Colgante Eternity Gris luz neutra' },
  { code: 'PROD-114', nombre: 'Colgante Eternity Gris luz fria' },
  // Colgante Girito
  { code: 'PROD-115', nombre: 'Colgante Girito Negro luz calida' },
  { code: 'PROD-116', nombre: 'Colgante Girito Negro luz neutra' },
  { code: 'PROD-117', nombre: 'Colgante Girito Negro luz fria' },
  { code: 'PROD-118', nombre: 'Colgante Girito Gris luz calida' },
  { code: 'PROD-119', nombre: 'Colgante Girito Gris luz neutra' },
  { code: 'PROD-120', nombre: 'Colgante Girito Gris luz fria' },
  // Colgante Medialuna
  { code: 'PROD-121', nombre: 'Colgante Medialuna Negro luz calida' },
  { code: 'PROD-122', nombre: 'Colgante Medialuna Negro luz neutra' },
  { code: 'PROD-123', nombre: 'Colgante Medialuna Negro luz fria' },
  { code: 'PROD-124', nombre: 'Colgante Medialuna Gris luz calida' },
  { code: 'PROD-125', nombre: 'Colgante Medialuna Gris luz neutra' },
  { code: 'PROD-126', nombre: 'Colgante Medialuna Gris luz fria' },
  // Colgante Lineal XL
  { code: 'PROD-127', nombre: 'Colgante Lineal XL Negro luz calida x 1 metro' },
  { code: 'PROD-128', nombre: 'Colgante Lineal XL Negro luz neutra x 1 metro' },
  { code: 'PROD-129', nombre: 'Colgante Lineal XL Negro luz fria x 1 metro' },
  { code: 'PROD-130', nombre: 'Colgante Lineal XL Gris luz calida x 1 metro' },
  { code: 'PROD-131', nombre: 'Colgante Lineal XL Gris luz neutra x 1 metro' },
  { code: 'PROD-132', nombre: 'Colgante Lineal XL Gris luz fria x 1 metro' },
  // Colgante Lineal L
  { code: 'PROD-133', nombre: 'Colgante Lineal L Negro luz calida x 1 metro' },
  { code: 'PROD-134', nombre: 'Colgante Lineal L Negro luz neutra x 1 metro' },
  { code: 'PROD-135', nombre: 'Colgante Lineal L Negro luz fria x 1 metro' },
  { code: 'PROD-136', nombre: 'Colgante Lineal L Gris luz calida x 1 metro' },
  { code: 'PROD-137', nombre: 'Colgante Lineal L Gris luz neutra x 1 metro' },
  { code: 'PROD-138', nombre: 'Colgante Lineal L Gris luz fria x 1 metro' },
  // Colgante Lineal S
  { code: 'PROD-139', nombre: 'Colgante Lineal S Negro luz calida x 1 metro' },
  { code: 'PROD-140', nombre: 'Colgante Lineal S Negro luz neutra x 1 metro' },
  { code: 'PROD-141', nombre: 'Colgante Lineal S Negro luz fria x 1 metro' },
  { code: 'PROD-142', nombre: 'Colgante Lineal S Gris luz calida x 1 metro' },
  { code: 'PROD-143', nombre: 'Colgante Lineal S Gris luz neutra x 1 metro' },
  { code: 'PROD-144', nombre: 'Colgante Lineal S Gris luz fria x 1 metro' },
  // Colgante Quadra
  { code: 'PROD-145', nombre: 'Colgante Quadra 80-60-40 Negro luz calida' },
  { code: 'PROD-146', nombre: 'Colgante Quadra 80-60-40 Negro luz neutra' },
  { code: 'PROD-147', nombre: 'Colgante Quadra 80-60-40 Negro luz fria' },
  { code: 'PROD-148', nombre: 'Colgante Quadra 80-60-40 Gris luz calida' },
  { code: 'PROD-149', nombre: 'Colgante Quadra 80-60-40 Gris luz neutra' },
  { code: 'PROD-150', nombre: 'Colgante Quadra 80-60-40 Gris luz fria' },
  // Lámpara de escritorio Trip
  { code: 'PROD-151', nombre: 'Lampara de escritorio Trip Negro luz calida' },
  { code: 'PROD-152', nombre: 'Lampara de escritorio Trip Negro luz neutra' },
  { code: 'PROD-153', nombre: 'Lampara de escritorio Trip Negro luz fria' },
  { code: 'PROD-154', nombre: 'Lampara de escritorio Trip Gris luz calida' },
  { code: 'PROD-155', nombre: 'Lampara de escritorio Trip Gris luz neutra' },
  { code: 'PROD-156', nombre: 'Lampara de escritorio Trip Gris luz fria' },
  // Lámpara de escritorio Arial
  { code: 'PROD-157', nombre: 'Lampara de escritorio Arial Negro luz calida' },
  { code: 'PROD-158', nombre: 'Lampara de escritorio Arial Negro luz neutra' },
  { code: 'PROD-159', nombre: 'Lampara de escritorio Arial Negro luz fria' },
  { code: 'PROD-160', nombre: 'Lampara de escritorio Arial Gris luz calida' },
  { code: 'PROD-161', nombre: 'Lampara de escritorio Arial Gris luz neutra' },
  { code: 'PROD-162', nombre: 'Lampara de escritorio Arial Gris luz fria' },
  // Lámpara de escritorio Colou
  { code: 'PROD-163', nombre: 'Lampara de escritorio Colou Negro luz calida' },
  { code: 'PROD-164', nombre: 'Lampara de escritorio Colou Negro luz neutra' },
  { code: 'PROD-165', nombre: 'Lampara de escritorio Colou Negro luz fria' },
  { code: 'PROD-166', nombre: 'Lampara de escritorio Colou Gris luz calida' },
  { code: 'PROD-167', nombre: 'Lampara de escritorio Colou Gris luz neutra' },
  { code: 'PROD-168', nombre: 'Lampara de escritorio Colou Gris luz fria' },
  // Lámpara de escritorio Prime
  { code: 'PROD-169', nombre: 'Lampara de escritorio Prime Negro luz calida' },
  { code: 'PROD-170', nombre: 'Lampara de escritorio Prime Negro luz neutra' },
  { code: 'PROD-171', nombre: 'Lampara de escritorio Prime Negro luz fria' },
  { code: 'PROD-172', nombre: 'Lampara de escritorio Prime Gris luz calida' },
  { code: 'PROD-173', nombre: 'Lampara de escritorio Prime Gris luz neutra' },
  { code: 'PROD-174', nombre: 'Lampara de escritorio Prime Gris luz fria' },
  // Lámpara de escritorio Fluxa
  { code: 'PROD-175', nombre: 'Lampara de escritorio Fluxa Negro luz calida' },
  { code: 'PROD-176', nombre: 'Lampara de escritorio Fluxa Negro luz neutra' },
  { code: 'PROD-177', nombre: 'Lampara de escritorio Fluxa Negro luz fria' },
  { code: 'PROD-178', nombre: 'Lampara de escritorio Fluxa Gris luz calida' },
  { code: 'PROD-179', nombre: 'Lampara de escritorio Fluxa Gris luz neutra' },
  { code: 'PROD-180', nombre: 'Lampara de escritorio Fluxa Gris luz fria' },
  // Lámpara de pie Menguante
  { code: 'PROD-181', nombre: 'Lampara de pie Menguante Negro luz calida' },
  { code: 'PROD-182', nombre: 'Lampara de pie Menguante Negro luz neutra' },
  { code: 'PROD-183', nombre: 'Lampara de pie Menguante Negro luz fria' },
  { code: 'PROD-184', nombre: 'Lampara de pie Menguante Gris luz calida' },
  { code: 'PROD-185', nombre: 'Lampara de pie Menguante Gris luz neutra' },
  { code: 'PROD-186', nombre: 'Lampara de pie Menguante Gris luz fria' },
  // Aplique Forte
  { code: 'PROD-187', nombre: 'Aplique Forte negro luz calida' },
  { code: 'PROD-188', nombre: 'Aplique Forte negro luz neutra' },
  { code: 'PROD-189', nombre: 'Aplique Forte negro luz fria' },
  { code: 'PROD-190', nombre: 'Aplique Forte Gris luz calida' },
  { code: 'PROD-191', nombre: 'Aplique Forte Gris luz neutra' },
  { code: 'PROD-192', nombre: 'Aplique Forte Gris luz fria' },
  // Aplique Linaris x 30cm
  { code: 'PROD-193', nombre: 'Aplique Linaris x 30cm negro luz calida' },
  { code: 'PROD-194', nombre: 'Aplique Linaris x 30cm negro luz neutra' },
  { code: 'PROD-195', nombre: 'Aplique Linaris x 30cm negro luz fria' },
  { code: 'PROD-196', nombre: 'Aplique Linaris x 30cm Gris luz calida' },
  { code: 'PROD-197', nombre: 'Aplique Linaris x 30cm Gris luz neutra' },
  { code: 'PROD-198', nombre: 'Aplique Linaris x 30cm Gris luz fria' },
  // Aplique Linaris x 50cm
  { code: 'PROD-199', nombre: 'Aplique Linaris x 50cm negro luz calida' },
  { code: 'PROD-200', nombre: 'Aplique Linaris x 50cm negro luz neutra' },
  { code: 'PROD-201', nombre: 'Aplique Linaris x 50cm negro luz fria' },
  { code: 'PROD-202', nombre: 'Aplique Linaris x 50cm Gris luz calida' },
  { code: 'PROD-203', nombre: 'Aplique Linaris x 50cm Gris luz neutra' },
  { code: 'PROD-204', nombre: 'Aplique Linaris x 50cm Gris luz fria' },
  // Aplique Linaris x 75cm
  { code: 'PROD-205', nombre: 'Aplique Linaris x 75cm negro luz calida' },
  { code: 'PROD-206', nombre: 'Aplique Linaris x 75cm negro luz neutra' },
  { code: 'PROD-207', nombre: 'Aplique Linaris x 75cm negro luz fria' },
  { code: 'PROD-208', nombre: 'Aplique Linaris x 75cm Gris luz calida' },
  { code: 'PROD-209', nombre: 'Aplique Linaris x 75cm Gris luz neutra' },
  { code: 'PROD-210', nombre: 'Aplique Linaris x 75cm Gris luz fria' },
  // Aplique Linaris x 100cm
  { code: 'PROD-211', nombre: 'Aplique Linaris x 100cm negro luz calida' },
  { code: 'PROD-212', nombre: 'Aplique Linaris x 100cm negro luz neutra' },
  { code: 'PROD-213', nombre: 'Aplique Linaris x 100cm negro luz fria' },
  { code: 'PROD-214', nombre: 'Aplique Linaris x 100cm Gris luz calida' },
  { code: 'PROD-215', nombre: 'Aplique Linaris x 100cm Gris luz neutra' },
  { code: 'PROD-216', nombre: 'Aplique Linaris x 100cm Gris luz fria' },
];

// ─── INSUMOS ─────────────────────────────────────────────────────────────────
const INSUMOS = [
  { code: 'INS-001', descripcion: 'Fuente 30A' },
  { code: 'INS-002', descripcion: 'Fuente 25A' },
  { code: 'INS-003', descripcion: 'Fuente 16.5A' },
  { code: 'INS-004', descripcion: 'Fuente 12.5A' },
  { code: 'INS-005', descripcion: 'Fuente 8.5A' },
  { code: 'INS-006', descripcion: 'Fuente 5A' },
  { code: 'INS-007', descripcion: 'Fuente 3A' },
  { code: 'INS-008', descripcion: 'Fuente 2.1A' },
  { code: 'INS-009', descripcion: 'Fuente 1A' },
  { code: 'INS-010', descripcion: 'Fuente con cable 1.5A' },
  { code: 'INS-011', descripcion: 'Driver 3W' },
  { code: 'INS-012', descripcion: 'Driver 6W' },
  { code: 'INS-013', descripcion: 'Controladora RGB' },
  { code: 'INS-014', descripcion: 'Tecla Smart Tactil' },
  { code: 'INS-015', descripcion: 'Domo 18' },
  { code: 'INS-016', descripcion: 'Control remoto' },
  { code: 'INS-017', descripcion: 'Dimmer inalambrico tipo Fuente' },
  { code: 'INS-018', descripcion: 'Dimmer c/ control llavero' },
  { code: 'INS-019', descripcion: 'Tecla inalambrica doble' },
  { code: 'INS-020', descripcion: 'Dimmer tecla + rueda blanco' },
  { code: 'INS-021', descripcion: 'Dimmer tecla + rueda negro' },
  { code: 'INS-022', descripcion: 'Controlador 5 en 1' },
  { code: 'INS-023', descripcion: 'Caja 60x60' },
  { code: 'INS-024', descripcion: 'Caja 80x80' },
  { code: 'INS-025', descripcion: 'Caja 100x100' },
  { code: 'INS-026', descripcion: 'Caja 20x25' },
  { code: 'INS-027', descripcion: 'Caja 20x100' },
  { code: 'INS-028', descripcion: 'Caja 20x150' },
  { code: 'INS-029', descripcion: 'Base 1 aro negra' },
  { code: 'INS-030', descripcion: 'Base 2 aros negra' },
  { code: 'INS-031', descripcion: 'Base 3 aros negra' },
  { code: 'INS-032', descripcion: 'Base 4 aros negra' },
  { code: 'INS-033', descripcion: 'Base 5 aros negra' },
  { code: 'INS-034', descripcion: 'Base 6 aros negra' },
  { code: 'INS-035', descripcion: 'Base rectangular negra' },
  { code: 'INS-036', descripcion: 'Base cuadrada ciega negra' },
  { code: 'INS-037', descripcion: 'Base cuadrada negra' },
  { code: 'INS-038', descripcion: 'Base aplique negra' },
  { code: 'INS-039', descripcion: 'Base 1 aro gris' },
  { code: 'INS-040', descripcion: 'Base 2 aros gris' },
  { code: 'INS-041', descripcion: 'Base 3 aros gris' },
  { code: 'INS-042', descripcion: 'Base 4 aros gris' },
  { code: 'INS-043', descripcion: 'Base 5 aros gris' },
  { code: 'INS-044', descripcion: 'Base 6 aros gris' },
  { code: 'INS-045', descripcion: 'Base rectangular gris' },
  { code: 'INS-046', descripcion: 'Base cuadrada ciega gris' },
  { code: 'INS-047', descripcion: 'Base cuadrada gris' },
  { code: 'INS-048', descripcion: 'Base aplique gris' },
  { code: 'INS-049', descripcion: 'Base 1 aro' },
  { code: 'INS-050', descripcion: 'Base 2 aros' },
  { code: 'INS-051', descripcion: 'Base 3 aros' },
  { code: 'INS-052', descripcion: 'Base 4 aros' },
  { code: 'INS-053', descripcion: 'Base 5 aros' },
  { code: 'INS-054', descripcion: 'Base 6 aros' },
  { code: 'INS-055', descripcion: 'Base rectangular' },
  { code: 'INS-056', descripcion: 'Base cuadrada ciega' },
  { code: 'INS-057', descripcion: 'Base cuadrada' },
  { code: 'INS-058', descripcion: 'Base aplique' },
  { code: 'INS-059', descripcion: 'Arandela de fibra 3/8' },
  { code: 'INS-060', descripcion: 'Tira led 12v CALIDO x mt' },
  { code: 'INS-061', descripcion: 'Tira led 12v NEUTRO x mt' },
  { code: 'INS-062', descripcion: 'Tira led 12v FRIO x mt' },
  { code: 'INS-063', descripcion: 'Tira COB SuperCalido 24v x mt' },
  { code: 'INS-064', descripcion: 'Cruceta c/ oreja' },
  { code: 'INS-065', descripcion: 'Cruceta simple' },
  { code: 'INS-066', descripcion: 'Prensacable' },
  { code: 'INS-067', descripcion: 'Tuerca 3/8' },
  { code: 'INS-068', descripcion: 'Perilla moteada' },
  { code: 'INS-069', descripcion: 'Sensor TOUCH' },
  { code: 'INS-070', descripcion: 'Sensor PROXIMIDAD' },
  { code: 'INS-071', descripcion: 'Cable conector velador' },
  { code: 'INS-072', descripcion: '3D Menguante' },
  { code: 'INS-073', descripcion: '3D Nebula' },
  { code: 'INS-074', descripcion: '3D Colou' },
  { code: 'INS-075', descripcion: 'Varilla roscada 7cm' },
  { code: 'INS-076', descripcion: 'Varilla roscada 2mts' },
  { code: 'INS-077', descripcion: 'Perfil gris x mt' },
  { code: 'INS-078', descripcion: 'Perfil negro x mt' },
  { code: 'INS-079', descripcion: 'Tulipa opal x mt' },
  { code: 'INS-080', descripcion: 'Perfil H negro' },
  { code: 'INS-081', descripcion: 'Perfil H gris' },
  { code: 'INS-082', descripcion: 'Cable acerado x metro' },
  { code: 'INS-083', descripcion: 'Cable iluminacion x metro' },
];

// ─── PRODUCCION HISTÓRICA ─────────────────────────────────────────────────────
const PRODUCCION_DATA = [
  { fecha: '2026-01-18', nombre: 'Saturno 6 aros Ø100-80-70-60-45-30 Gris luz neutra',       cantidad: 2, responsable: 'Juan',          costoMP: 0 },
  { fecha: '2026-01-22', nombre: 'Saturno 6 aros Ø100-80-70-60-45-30 Negro luz calida',       cantidad: 1, responsable: 'Juan',          costoMP: 0 },
  { fecha: '2026-01-23', nombre: 'Lampara de escritorio Trip Gris luz fria',                   cantidad: 1, responsable: 'Juan',          costoMP: 0 },
  { fecha: '2026-01-23', nombre: 'Colgante Eternity Negro luz calida',                         cantidad: 1, responsable: 'Juan',          costoMP: 0 },
  { fecha: '2026-01-25', nombre: 'Colgante Eternity Negro luz fria',                           cantidad: 2, responsable: 'Mercado Libre', costoMP: 282000 },
  { fecha: '2026-01-27', nombre: 'Saturno 1 aro Ø60 Negro luz neutra',                        cantidad: 3, responsable: 'Mercado Libre', costoMP: 0 },
  { fecha: '2026-01-28', nombre: 'Lampara de escritorio Trip Negro luz calida',                cantidad: 1, responsable: 'Juan',          costoMP: 0 },
  { fecha: '2026-01-28', nombre: 'Aplique Forte Gris luz neutra',                              cantidad: 1, responsable: 'Tienda',        costoMP: 0 },
  { fecha: '2026-01-28', nombre: 'Saturno 1 aro Ø60 Gris luz neutra',                         cantidad: 4, responsable: 'Mercado Libre', costoMP: 0 },
  { fecha: '2026-01-28', nombre: 'Saturno 1 aro Ø30 Gris luz neutra',                         cantidad: 4, responsable: 'Mercado Libre', costoMP: 0 },
  { fecha: '2026-01-28', nombre: 'Lampara de escritorio Prime Negro luz fria',                 cantidad: 1, responsable: 'Mercado Libre', costoMP: 0 },
  { fecha: '2026-01-28', nombre: 'Colgante Lineal XL Negro luz calida x 1 metro',             cantidad: 1, responsable: 'Mercado Libre', costoMP: 0 },
  { fecha: '2026-01-28', nombre: 'Saturno 1 aro Ø30 Negro luz neutra',                        cantidad: 1, responsable: 'Mercado Libre', costoMP: 0 },
];

// ─── RECETAS ─────────────────────────────────────────────────────────────────
const S = ['INS-007', 'INS-065', 'INS-075', 'INS-068', 'INS-066', 'INS-067', 'INS-059', 'INS-025', 'INS-049'];
const E = ['INS-007', 'INS-049', 'INS-023', 'INS-060', 'INS-065', 'INS-066', 'INS-067', 'INS-068', 'INS-075', 'INS-078'];
function r(prods: string[], ins: string[]): [string, string][] {
  return prods.flatMap(p => ins.map(i => [p, i] as [string, string]));
}
const RECIPES: [string, string][] = [
  ...r(['PROD-109', 'PROD-110', 'PROD-111', 'PROD-112', 'PROD-113', 'PROD-114'], E),
  ...r(['PROD-001', 'PROD-004', 'PROD-007', 'PROD-010', 'PROD-013', 'PROD-016'], [...S, 'INS-078', 'INS-060']),
  ...r(['PROD-002', 'PROD-005', 'PROD-008', 'PROD-011', 'PROD-014', 'PROD-017'], [...S, 'INS-078', 'INS-061']),
  ...r(['PROD-003', 'PROD-006', 'PROD-009', 'PROD-012', 'PROD-015', 'PROD-018'], [...S, 'INS-078', 'INS-062']),
  ...r(['PROD-019', 'PROD-022', 'PROD-025', 'PROD-028', 'PROD-031', 'PROD-034'], [...S, 'INS-077', 'INS-060']),
  ...r(['PROD-020', 'PROD-023', 'PROD-026', 'PROD-029', 'PROD-032', 'PROD-035'], [...S, 'INS-077', 'INS-061']),
  ...r(['PROD-021', 'PROD-024', 'PROD-027', 'PROD-030', 'PROD-033', 'PROD-036'], [...S, 'INS-077', 'INS-062']),
];

// ─── PRODUCTOS DE REVENTA ─────────────────────────────────────────────────────
const RETAIL_PRODUCTS = [
  { codigo: 'LAMP-07MIX-NE',    nombre: 'Velador magnetico negro CCT Bateria',                 stock: 4,  costo: 23111,     precioVenta: 48196.55 },
  { codigo: 'LAMP-07MIX-BL',    nombre: 'Velador magnetico blanco CCT Bateria',                stock: 4,  costo: 23111,     precioVenta: 48196.55 },
  { codigo: 'lamp-04ww-bl',     nombre: 'Lampara de mesa magnetica blanca 3w recargable',       stock: 0,  costo: 23232,     precioVenta: 48449.27 },
  { codigo: 'lamp-04ww-ne',     nombre: 'Lampara de mesa magnetica negra 3w recargable',        stock: 0,  costo: 23232,     precioVenta: 48449.27 },
  { codigo: 'GU10-18WW-A3',     nombre: 'Lampara dicroica 7w calido',                          stock: 25, costo: 1331,      precioVenta: 3000 },
  { codigo: 'gu10-15nw-n2',     nombre: 'Lampara dicroica 7w neutro',                          stock: 11, costo: 1331,      precioVenta: 3000 },
  { codigo: 'gu10-18cw-A3',     nombre: 'Dicroica 7W frio',                                    stock: 0,  costo: 1331,      precioVenta: 2681.96 },
  { codigo: 'gu10-19ww-A3',     nombre: 'Dicroica 7w calido dimerizable',                      stock: 0,  costo: 1936,      precioVenta: 3901.04 },
  { codigo: 'gu10-15rgbw-a2',   nombre: 'Dicroica RGB',                                        stock: 0,  costo: 7381,      precioVenta: 14872.71 },
  { codigo: 'ar111-16nw-n3',    nombre: 'Lampara AR111 neutro 12w',                            stock: 0,  costo: 4779.50,   precioVenta: 8354.50 },
  { codigo: 'e27-04cw-n1',      nombre: 'Lampara LED e27 7w frio',                             stock: 0,  costo: 726,       precioVenta: 1278.75 },
  { codigo: 'e27-04ww-n1',      nombre: 'Lampara LED e27 7w calido',                           stock: 0,  costo: 726,       precioVenta: 1278.75 },
  { codigo: 'g9-05nw-b2',       nombre: 'Lampara G9 7W neutra',                                stock: 0,  costo: 3025,      precioVenta: 6308.50 },
  { codigo: 'Col-167-35-n1',    nombre: 'Colgante tubo negro 35cm (sin dicroica)',              stock: 4,  costo: 7707.70,   precioVenta: 13503.60 },
  { codigo: 'Artx-05nw',        nombre: 'Aplique exterior redondo Ø15 negro neutro',            stock: 1,  costo: 27709,     precioVenta: 64599.04 },
  { codigo: 'artx-05ww-bl',     nombre: 'Aplique exterior redondo Ø15 blanco calido',           stock: 1,  costo: 27709,     precioVenta: 64599.04 },
  { codigo: 'artx-01nw',        nombre: 'Aplique exterior redondo Ø12 negro neutro',            stock: 1,  costo: 15125,     precioVenta: 35579.94 },
  { codigo: 'artx-07nw',        nombre: 'Aplique exterior semicircular 7w negro neutro',        stock: 1,  costo: 35574,     precioVenta: 80748.80 },
  { codigo: 'artx-15nw-b2',     nombre: 'Aplique exterior curvo 12w negro neutro',              stock: 1,  costo: 37617.69,  precioVenta: 78450.45 },
  { codigo: 'artx-15nw-bl-b2',  nombre: 'Aplique exterior curvo 12w blanco neutro',             stock: 1,  costo: 37617.69,  precioVenta: 78450.45 },
  { codigo: 'art-38bl',         nombre: 'Aplique movil blanco (art-38bl)',                      stock: 1,  costo: 40172,     precioVenta: 80946.57 },
  { codigo: 'Art-37bl',         nombre: 'Aplique movil blanco con 2 cabezales',                 stock: 0,  costo: 26378,     precioVenta: 53151.66 },
  { codigo: 'Art-36ne',         nombre: 'Aplique movil negro 1 cabezal',                        stock: 0,  costo: 13431,     precioVenta: 29019.10 },
  { codigo: 'Art-36bl',         nombre: 'Aplique movil blanco 1 cabezal',                       stock: 0,  costo: 13431,     precioVenta: 29019.10 },
  { codigo: 'art-09ne-n1',      nombre: 'Cabezal movil negro para dicroica GU10',               stock: 0,  costo: 10527,     precioVenta: 18959.60 },
  { codigo: 'apl-43cct-a2',     nombre: 'Plafon SMART cuadrado 40x40 blanco',                  stock: 0,  costo: 66550,     precioVenta: 144590.82 },
  { codigo: 'Apl-42cct-a2',     nombre: 'Plafon SMART redondo Ø60 blanco',                     stock: 0,  costo: 94380,     precioVenta: 205657.10 },
  { codigo: 'apl-44cct-a2',     nombre: 'Plafon SMART cuadrado 50x50 blanco',                  stock: 0,  costo: 84700,     precioVenta: 176638 },
  { codigo: 'apl-45cct-a2',     nombre: 'Plafon SMART cuadrado 60x60 blanco',                  stock: 0,  costo: 109747,    precioVenta: 0 },
  { codigo: 'apl-29ww-ne-b2',   nombre: 'Panel negro 48w 30x120 calido',                       stock: 0,  costo: 44770,     precioVenta: 93365.80 },
  { codigo: 'apl-27cw-b2',      nombre: 'Panel redondo Ø60 blanco 40w frio',                   stock: 0,  costo: 72600,     precioVenta: 151404 },
  { codigo: 'apl-27cw-ne-b2',   nombre: 'Plafon redondo negro Ø60 frio',                       stock: 0,  costo: 72600,     precioVenta: 151404 },
  { codigo: 'apl-27ww-b2',      nombre: 'Plafon redondo blanco Ø60 calido',                    stock: 0,  costo: 72600,     precioVenta: 151404 },
  { codigo: 'apl-27ww-ne-b2',   nombre: 'Plafon redondo negro Ø60 calido',                     stock: 0,  costo: 72600,     precioVenta: 151404 },
  { codigo: 'apl-05cw-a4-q',    nombre: 'Plafon led cuadrado 12x12 6w blanco frio',            stock: 1,  costo: 4477,      precioVenta: 9588.97 },
  { codigo: 'apl-23nw-a4',      nombre: 'Plafon led redondo FRAMELESS Ø22 42w neutro',         stock: 0,  costo: 26499,     precioVenta: 55262.45 },
  { codigo: 'apl-23ww-a4',      nombre: 'Plafon led redondo FRAMELESS Ø22 42w calido',         stock: 5,  costo: 26499,     precioVenta: 55262.45 },
  { codigo: 'apl-24cw-a4',      nombre: 'Plafon led cuadrado 17x17 22w calido',                stock: 2,  costo: 18755,     precioVenta: 39111.82 },
  { codigo: 'swim-01cw-a2',     nombre: 'Luminaria para pileta IP68 100mm blanco frio 10w',    stock: 0,  costo: 19360,     precioVenta: 40374.40 },
  { codigo: 'cal-09cw-b3',      nombre: 'Luminaria led de calle 50w',                          stock: 0,  costo: 23232,     precioVenta: 48449.27 },
  { codigo: 'cal-10cw-b3',      nombre: 'Luminaria led de calle 100w',                         stock: 0,  costo: 32791,     precioVenta: 68384.14 },
  { codigo: 'cal-11cw-b3',      nombre: 'Luminaria led de calle 150w',                         stock: 0,  costo: 46101,     precioVenta: 96141.54 },
  { codigo: 'cal-12cw-b3',      nombre: 'Luminaria led de calle 200w',                         stock: 0,  costo: 68970,     precioVenta: 143833.80 },
  { codigo: 'calacc-01',        nombre: 'Adaptador POSTE para luminaria de calle',              stock: 0,  costo: 31460,     precioVenta: 65608.40 },
  { codigo: 'calacc-02-b2',     nombre: 'Adaptador PARED para luminaria de calle',             stock: 0,  costo: 10890,     precioVenta: 22710.60 },
  { codigo: 'Bn-09rgb-a2',      nombre: 'Bañador led RGB 1 metro',                             stock: 0,  costo: 102245,    precioVenta: 213227.30 },
  { codigo: 'bar-11cw-a3',      nombre: 'Varilla led 6w 40cm frio',                            stock: 0,  costo: 3267,      precioVenta: 6813.17 },
  { codigo: 'bar-11-nw-a3',     nombre: 'Varilla led 6w 40cm neutro',                          stock: 0,  costo: 3267,      precioVenta: 6813.17 },
  { codigo: 'bar-11-ww-a3',     nombre: 'Varilla led 6w 40cm calido',                          stock: 0,  costo: 3267,      precioVenta: 6813.17 },
  { codigo: 'bar-12cw-a3',      nombre: 'Varilla led 6w 50cm frio',                            stock: 0,  costo: 3593.70,   precioVenta: 7495.17 },
  { codigo: 'bar-12nw-a3',      nombre: 'Varilla led 6w 50cm neutro',                          stock: 0,  costo: 3593.70,   precioVenta: 7495.17 },
  { codigo: 'bar-12ww-a3',      nombre: 'Varilla led 6w 50cm calido',                          stock: 0,  costo: 3593.70,   precioVenta: 7495.17 },
  { codigo: 'bar-13cw-a3',      nombre: 'Varilla led 6w 80cm frio',                            stock: 0,  costo: 4150.30,   precioVenta: 8654.58 },
  { codigo: 'bar-13nw-a3',      nombre: 'Varilla led 6w 80cm neutro',                          stock: 0,  costo: 4150.30,   precioVenta: 8654.58 },
  { codigo: 'bar-13ww-a3',      nombre: 'Varilla led 6w 80cm calido',                          stock: 0,  costo: 4150.30,   precioVenta: 8654.58 },
  { codigo: 'bar-14cw-a3',      nombre: 'Varilla led 6w 100cm frio',                           stock: 0,  costo: 5614.40,   precioVenta: 11708.23 },
  { codigo: 'bar-14nw-a3',      nombre: 'Varilla led 6w 100cm neutro',                         stock: 0,  costo: 5614.40,   precioVenta: 11708.23 },
  { codigo: 'bar-14ww-a3',      nombre: 'Varilla led 6w 100cm calido',                         stock: 0,  costo: 5614.40,   precioVenta: 11708.23 },
  { codigo: 'bar-16cw-a3',      nombre: 'Varilla led 6w 120cm frio',                           stock: 0,  costo: 6231.50,   precioVenta: 12995.51 },
  { codigo: 'bar-16nw-a3',      nombre: 'Varilla led 6w 120cm neutro',                         stock: 0,  costo: 6231.50,   precioVenta: 12995.51 },
  { codigo: 'bar-16ww-a3',      nombre: 'Varilla led 6w 120cm calido',                         stock: 0,  costo: 6231.50,   precioVenta: 12995.51 },
  { codigo: 'bar-18cw-a3',      nombre: 'Varilla led 6w 150cm frio',                           stock: 0,  costo: 7218,      precioVenta: 15177.91 },
  { codigo: 'bar-18nw-a3',      nombre: 'Varilla led 6w 150cm neutro',                         stock: 0,  costo: 7218,      precioVenta: 15177.91 },
  { codigo: 'bar-18ww-a3',      nombre: 'Varilla led 6w 150cm calido',                         stock: 0,  costo: 7218,      precioVenta: 15177.91 },
  { codigo: 'tsmd-54nw-b2',     nombre: 'Tira LED 2835 12v 120led/m neutro x metro',           stock: 0,  costo: 3267,      precioVenta: 34065.91 },
  { codigo: 'tcob-06cct-24v',   nombre: 'Tira led COB 24v PVC',                                stock: 0,  costo: 22143,     precioVenta: 46178.22 },
  { codigo: 'tex-11cw',         nombre: 'Tira Led Neon flexible blanco frio',                   stock: 0,  costo: 83490,     precioVenta: 174114.60 },
  { codigo: 'tex-11nw',         nombre: 'Tira Led Neon flexible blanco neutro',                 stock: 0,  costo: 83490,     precioVenta: 174114.60 },
  { codigo: 'tex-12nw',         nombre: 'Manguera led rollo x 5 metros sin tela neutro',        stock: 0,  costo: 64130,     precioVenta: 133740.20 },
  { codigo: 'texacc-d22-06',    nombre: 'Clip de plastico para manguera',                       stock: 0,  costo: 242,       precioVenta: 5929.98 },
  { codigo: 'tsmdacc-17',       nombre: 'Clip de pared para tiras led 10mm',                    stock: 0,  costo: 9438,      precioVenta: 0 },
  { codigo: 'Per-03-2m-bl',     nombre: 'Perfil esquinero 16x16 blanco x 2 metros',             stock: 0,  costo: 3993,      precioVenta: 7418.45 },
  { codigo: 'per-03-tr-2m',     nombre: 'Perfil esquinero 16x16 transparente x 2 metros',       stock: 0,  costo: 0,         precioVenta: 0 },
  { codigo: 'peracc-03kit-a2',  nombre: 'Kit 2 tapas y 2 clips para perfil PER-03-2m',          stock: 0,  costo: 381.15,    precioVenta: 794.53 },
  { codigo: 'trk-r-01-bl-0,5m', nombre: 'Riel de iluminacion blanco track light 0.5m',         stock: 0,  costo: 2420,      precioVenta: 4876.30 },
  { codigo: 'trk-r-01-bl-1m',   nombre: 'Riel de iluminacion blanco track light 1m',            stock: 0,  costo: 4719,      precioVenta: 9508.78 },
  { codigo: 'riel-01bl-n2',     nombre: 'Riel de aluminio blanco x 1m 2 efectos con conector',  stock: 0,  costo: 32778.90,  precioVenta: 60100.52 },
  { codigo: 'riel-01ne-n2',     nombre: 'Riel de aluminio negro x 1m 2 efectos con conector',   stock: 0,  costo: 32778.90,  precioVenta: 60100.52 },
  { codigo: 'domo-38',          nombre: 'Camara Smart Interior',                                 stock: 0,  costo: 23111,     precioVenta: 48196.94 },
  { codigo: 'domo-43-b2',       nombre: 'Camara Smart exterior',                                 stock: 0,  costo: 39688,     precioVenta: 82767.52 },
  { codigo: 'domo-55',          nombre: 'Camara DUAL SMART para exterior',                       stock: 0,  costo: 77984.50,  precioVenta: 162633.12 },
  { codigo: 'Domo-50ne',        nombre: 'Tecla Smart de ventilador negro',                       stock: 0,  costo: 24442,     precioVenta: 53521.65 },
  { codigo: 'domo-53-a2',       nombre: 'Toma corriente SMART',                                  stock: 0,  costo: 12826,     precioVenta: 26750.85 },
  { codigo: 'elec-01ne-n1',     nombre: 'Tecla 1 canal 2 vias negro',                           stock: 0,  costo: 3097.60,   precioVenta: 0 },
  { codigo: 'elec-02bl-n1',     nombre: 'Tecla 2 canales 2 vias blanco',                        stock: 0,  costo: 3847.80,   precioVenta: 0 },
  { codigo: 'elec-03ne-n1',     nombre: 'Tecla 3 canales 2 vias negro',                         stock: 0,  costo: 6050,      precioVenta: 9786.70 },
  { codigo: 'Elec-04gr-n1',     nombre: 'Tecla 4 canales 2 vias gris',                          stock: 0,  costo: 7272.10,   precioVenta: 11781.55 },
  { codigo: 'Elec-05gr-n1',     nombre: 'Tecla y tomacorriente 1 canal gris',                   stock: 0,  costo: 4912.60,   precioVenta: 7945.30 },
  { codigo: 'Elec-06bl-n1',     nombre: 'Tecla y 2 USB C 1 canal 2 vias blanco',                stock: 0,  costo: 22687.50,  precioVenta: 36742.75 },
  { codigo: 'elec-06gr-n1',     nombre: 'Tecla y 2 USB C 1 canal 2 vias gris',                  stock: 0,  costo: 23486.10,  precioVenta: 38038.55 },
  { codigo: 'percon-06',        nombre: 'Controlador de Proximidad',                             stock: 0,  costo: 2783,      precioVenta: 6054.86 },
  { codigo: 'tom-1x20a-n1',     nombre: 'Toma corriente con interruptor 20A 220V',              stock: 0,  costo: 3097.60,   precioVenta: 5745.85 },
  { codigo: 'tomx-355be-n1',    nombre: 'Toma corriente estanco exterior beige 10A',             stock: 0,  costo: 6074.20,   precioVenta: 11253 },
  { codigo: 'ter-2x32A-n1',     nombre: 'Interruptor termomagnetico bipolar',                   stock: 0,  costo: 8119.10,   precioVenta: 13691.15 },
  { codigo: 'emer-11-n2',       nombre: 'Luz de emergencia 60 led',                             stock: 0,  costo: 13648.80,  precioVenta: 24620.20 },
  { codigo: 'Caj-1101gr-n1',    nombre: 'Caja de paso embutir octogonal 95x40x50mm',            stock: 0,  costo: 302.50,    precioVenta: 750.20 },
  { codigo: 'cajx-01bl-n1',     nombre: 'Caja de paso estanca 90x90x55mm',                      stock: 0,  costo: 1754.50,   precioVenta: 3256.55 },
  { codigo: 'cajx-03bl-n1',     nombre: 'Caja de paso estanca 115x115x80mm',                    stock: 0,  costo: 2637.80,   precioVenta: 4893.35 },
  { codigo: 'Cajx-04bl-n1',     nombre: 'Caja de paso estanca 165x115x65mm',                    stock: 0,  costo: 3339.60,   precioVenta: 6189.15 },
  { codigo: 'tapa-01argx1',     nombre: 'Tapa de seguridad para enchufes x 1',                  stock: 0,  costo: 84.70,     precioVenta: 178.18 },
  { codigo: 'fap-10-12v',       nombre: 'Fuente de alimentacion 1A 12v',                        stock: 0,  costo: 5687,      precioVenta: 12364.65 },
  { codigo: 'fap-100-12v-dt-b2', nombre: 'Fuente de alimentacion dimerizable 12v 8A',           stock: 0,  costo: 36300,     precioVenta: 75702 },
  { codigo: 'fap-60-24v-s',     nombre: 'Fuente de alimentacion 2.5A 24V',                      stock: 0,  costo: 11374,     precioVenta: 24476.97 },
  { codigo: 'fap-75-24v-s',     nombre: 'Fuente de alimentacion 3.2A 24v',                      stock: 0,  costo: 13915,     precioVenta: 29776.12 },
  { codigo: 'fap-200-24v-s',    nombre: 'Fuente de alimentacion 8.5A 24v',                      stock: 0,  costo: 23353,     precioVenta: 0 },
  { codigo: 'cnc-05-a2',        nombre: 'Conector monocromatico para tiras led interior',        stock: 0,  costo: 84.70,     precioVenta: 0 },
  { codigo: 'cnc-06-a2-a1',     nombre: 'Conector FAST CLIP 4 polos',                           stock: 0,  costo: 381.15,    precioVenta: 0 },
  { codigo: 'cnc-20',           nombre: 'Conector con adaptador para fuente',                    stock: 0,  costo: 459.80,    precioVenta: 0 },
  { codigo: 'cnc-36rgb-a2',     nombre: 'Conector macho y hembra para bañador',                 stock: 0,  costo: 3872,      precioVenta: 8074.87 },
  { codigo: 'cncbox-03',        nombre: 'Kit conectores FAST CLIP 2 y 3 polos x 70 piezas',     stock: 0,  costo: 14762,     precioVenta: 0 },
  { codigo: 'cncbox-04',        nombre: 'Kit conectores FAST CLIP 2 y 3 polos x 80 piezas',     stock: 0,  costo: 20812,     precioVenta: 0 },
  { codigo: 'fic-10gr-hax-n1',  nombre: 'Ficha hembra axial 10A',                               stock: 0,  costo: 1016.40,   precioVenta: 1892.55 },
  { codigo: 'fic-10bl-max-n1',  nombre: 'Ficha macho axial 10A',                                stock: 0,  costo: 1016.40,   precioVenta: 1892.55 },
  { codigo: 'alar-703-10m-n1',  nombre: 'Alargue prolongador tripolar 10A x 10 metros',         stock: 0,  costo: 17678.10,  precioVenta: 33554.40 },
  { codigo: 'Alar-704-15m-n1',  nombre: 'Alargue prolongador tripolar 10A x 15 metros',         stock: 0,  costo: 24490.40,  precioVenta: 46631.75 },
  { codigo: 'zap-4x1.5m-multi-n2', nombre: 'Zapatilla prolongador 4 tomas',                     stock: 0,  costo: 0,         precioVenta: 0 },
  { codigo: 'pre-01bl',         nombre: 'Precinto nylon blanco 2.5x100mm 100u',                 stock: 0,  costo: 326.70,    precioVenta: 0 },
  { codigo: 'pre-01ne',         nombre: 'Precinto nylon negro 2.5x100mm 100u',                  stock: 0,  costo: 326.70,    precioVenta: 704.55 },
  { codigo: 'pre-02ne',         nombre: 'Precinto negro 3.6x150mm 100u',                        stock: 0,  costo: 726,       precioVenta: 180 },
  { codigo: 'pre-03bl',         nombre: 'Precinto blanco 4.8x200mm 100u',                       stock: 0,  costo: 1252.35,   precioVenta: 2783.45 },
  { codigo: 'pre-03ne',         nombre: 'Precinto negro 4.8x200mm 100u',                        stock: 0,  costo: 1252.35,   precioVenta: 2783.45 },
  { codigo: 'pre-04bl',         nombre: 'Precinto blanco 7.6x300mm 100u',                       stock: 0,  costo: 3509,      precioVenta: 7570.20 },
  { codigo: 'pre-04ne',         nombre: 'Precinto negro 7.6x300mm 100u',                        stock: 0,  costo: 3509,      precioVenta: 7570.20 },
  { codigo: 'pre-acc-01bl',     nombre: 'Accesorios para precinto blanco x50u',                 stock: 0,  costo: 2662,      precioVenta: 5803.82 },
  { codigo: 'fan-01bl',         nombre: 'Ventilador de techo con luz LED CCT madera clara',     stock: 0,  costo: 147620,    precioVenta: 307854.80 },
  { codigo: 'fan-01ne',         nombre: 'Ventilador de techo con luz LED CCT madera oscura',    stock: 0,  costo: 147620,    precioVenta: 307854.80 },
  { codigo: 'ref-54cw-b4',      nombre: 'Reflector Led',                                        stock: 0,  costo: 11858,     precioVenta: 24727.91 },
  { codigo: 'cin-20ne-n2',      nombre: 'Cinta adhesiva aislante negra x 20m',                  stock: 0,  costo: 847,       precioVenta: 963 },
  { codigo: 'bat-23a-n1',       nombre: 'Pila ENERGIZER x 1',                                   stock: 0,  costo: 1173.70,   precioVenta: 2046 },
  { codigo: 'gui-07rgb',        nombre: 'Guirnalda RGB',                                         stock: 0,  costo: 2420,      precioVenta: 5046.80 },
  { codigo: 'sol-01',           nombre: 'Soldador USB con punta de lapiz',                       stock: 0,  costo: 9922,      precioVenta: 0 },
  { codigo: 'velsy',            nombre: 'Vela led amarilla',                                     stock: 0,  costo: 0,         precioVenta: 0 },
];

// ─── SEED ─────────────────────────────────────────────────────────────────────
async function seed() {
  // Asegurar que las tablas existen (SQLite auto-init)
  initializeTables();
  console.log('Tablas SQLite listas.\n');

  // 1. Productos
  console.log(`Insertando ${PRODUCTS.length} productos...`);
  let prodAdded = 0, prodSkipped = 0;
  for (const prod of PRODUCTS) {
    const ex = await db.select({ id: productos.id }).from(productos)
      .where(eq(productos.nombre, prod.nombre)).limit(1);
    if (ex.length === 0) {
      await db.insert(productos).values({ nombre: prod.nombre, stock: '0', precioVenta: '0' });
      prodAdded++;
      process.stdout.write('+');
    } else {
      prodSkipped++;
      process.stdout.write('.');
    }
  }
  console.log(`\n  ${prodAdded} nuevos, ${prodSkipped} ya existían.`);

  // 2. Mapear IDs de productos
  const allProductos = await db.select({ id: productos.id, nombre: productos.nombre }).from(productos);
  const prodMap: Record<string, number> = {};
  for (const p of PRODUCTS) {
    const found = allProductos.find(row => row.nombre === p.nombre);
    if (found) prodMap[p.code] = found.id;
  }

  // 3. Insumos
  console.log(`\nInsertando ${INSUMOS.length} insumos...`);
  let insAdded = 0, insUpdated = 0, insSkipped = 0;
  for (const ins of INSUMOS) {
    const ex = await db.select({ id: insumos.id, descripcion: insumos.descripcion }).from(insumos)
      .where(eq(insumos.codigo, ins.code)).limit(1);
    if (ex.length === 0) {
      await db.insert(insumos).values({
        codigo: ins.code, descripcion: ins.descripcion, unidad: 'u', cantidad: '0', precioUnitario: '0',
      });
      insAdded++;
      process.stdout.write('+');
    } else if (ex[0].descripcion === '(pendiente)') {
      await db.update(insumos).set({ descripcion: ins.descripcion }).where(eq(insumos.codigo, ins.code));
      insUpdated++;
      process.stdout.write('U');
    } else {
      insSkipped++;
      process.stdout.write('.');
    }
  }
  console.log(`\n  ${insAdded} nuevos, ${insUpdated} actualizados, ${insSkipped} sin cambios.`);

  // 4. Mapear IDs de insumos
  const allInsumos = await db.select({ id: insumos.id, codigo: insumos.codigo }).from(insumos);
  const insMap: Record<string, number> = {};
  for (const ins of INSUMOS) {
    const found = allInsumos.find(row => row.codigo === ins.code);
    if (found) insMap[ins.code] = found.id;
  }

  // 5. Recetas
  console.log(`\nInsertando ${RECIPES.length} relaciones de receta...`);
  let recAdded = 0, recSkipped = 0;
  for (const [pc, ic] of RECIPES) {
    const prodId = prodMap[pc];
    const insId = insMap[ic];
    if (!prodId || !insId) { console.warn(`\n  WARN: ID no encontrado para ${pc} o ${ic}`); continue; }
    const ex = await db.select({ id: recetas.id }).from(recetas)
      .where(and(eq(recetas.productoId, prodId), eq(recetas.insumoId, insId))).limit(1);
    if (ex.length === 0) {
      await db.insert(recetas).values({ productoId: prodId, insumoId: insId, cantidad: '1', unidad: 'u' });
      recAdded++;
    } else {
      recSkipped++;
    }
  }
  console.log(`  ${recAdded} recetas nuevas, ${recSkipped} ya existían.`);

  // 6. Producción histórica
  const existeProduccion = await db.select({ id: produccion.id }).from(produccion).limit(1);
  if (existeProduccion.length > 0) {
    console.log('\nProduccion: tabla con datos existentes — omitida para no duplicar.');
  } else {
    console.log(`\nInsertando ${PRODUCCION_DATA.length} registros de produccion...`);
    const allProductos2 = await db.select({ id: productos.id, nombre: productos.nombre }).from(productos);
    const prodNombreMap: Record<string, number> = {};
    for (const p of allProductos2) prodNombreMap[p.nombre] = p.id;

    let prodOk = 0, prodSkip = 0;
    for (const item of PRODUCCION_DATA) {
      const prodId = prodNombreMap[item.nombre];
      if (!prodId) { console.warn(`\n  WARN: No se encontro "${item.nombre}" — omitido.`); prodSkip++; continue; }
      await db.insert(produccion).values({
        fecha: item.fecha,
        productoId: prodId,
        cantidad: item.cantidad.toString(),
        responsable: item.responsable,
        costoMP: item.costoMP.toString(),
      });
      const stockRow = await db.select({ stock: productos.stock }).from(productos)
        .where(eq(productos.id, prodId)).limit(1);
      const nuevoStock = parseFloat(stockRow[0]?.stock?.toString() || '0') + item.cantidad;
      await db.update(productos).set({ stock: nuevoStock.toString() }).where(eq(productos.id, prodId));
      prodOk++;
      process.stdout.write('+');
    }
    console.log(`\n  ${prodOk} produccion cargada, ${prodSkip} omitidos.`);
  }

  // 7. Productos de reventa
  console.log(`\nInsertando ${RETAIL_PRODUCTS.length} productos de reventa...`);
  let retailAdded = 0, retailSkipped = 0;
  for (const prod of RETAIL_PRODUCTS) {
    const ex = await db.select({ id: productos.id }).from(productos)
      .where(eq(productos.codigo, prod.codigo)).limit(1);
    if (ex.length > 0) { retailSkipped++; process.stdout.write('.'); continue; }
    await db.insert(productos).values({
      codigo: prod.codigo, nombre: prod.nombre,
      stock: prod.stock.toString(), costo: prod.costo.toString(), precioVenta: prod.precioVenta.toString(),
    });
    retailAdded++;
    process.stdout.write('+');
  }
  console.log(`\n  ${retailAdded} nuevos, ${retailSkipped} ya existian.`);

  console.log('\nSeed completado.');
  process.exit(0);
}

seed().catch(err => {
  console.error('\nError en seed:', err?.message || err);
  process.exit(1);
});
